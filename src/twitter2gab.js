/* 

Twitter2Gab by gab.ai/miraculix

*/

/* ################################################################################################## */
/* ################################################################################################## */
/* ################################################################################################## */

const DEBUG = false;

var gGabCheckbox;
var gCheckBoxLabel;
var gTwitterUiScreenname = "";
var gMutationTimeoutId = null;
var gOptionPostreplies = false;
var gOptionIncludeUrl = true;
var gOptionShareRt = false;
var gLoggedIntoGab = true;

/* ################################################################################################## */
/* ################################################################################################## */
/* ################################################################################################## */

function debugLog(txt)
{
  if (DEBUG) console.log(getTimestamp() + ": " + txt);
}

function getTimestamp()
{
  return Math.floor(Date.now() / 1000);
}

/* ################################################################################################## */

async function getOptionsStorage()
{
  	let settings = await browser.storage.local.get(['postreplies', 'includetweeturl', 'sharert']);
  	if (settings == null) return false;
  	if (settings.postreplies != null) gOptionPostreplies = settings.postreplies;
  	if (settings.includetweeturl != null) gOptionIncludeUrl = settings.includetweeturl;
  	if (settings.sharert != null) gOptionShareRt = settings.sharert;
  	return true;
}

/* ################################################################################################## */

function createShareToGabItem(id)
{
	let extras_item = document.createElement('div');
	extras_item.setAttribute("class", "Share2Gab-item");
	extras_item.setAttribute("t2g", "haxxed");

	let cb_label = document.createElement('label');
	cb_label.setAttribute("class","t2g-cb-label");
	cb_label.innerHTML = "  Share on gab.ai";
	cb_label.setAttribute("for", "share2gab-" + id);

	let cb_sharegab = document.createElement('input');
	cb_sharegab.setAttribute("type", "checkbox");
	cb_sharegab.setAttribute("class", "share2gab");
	cb_sharegab.setAttribute("id", "share2gab-" + id);

	if (gOptionShareRt) cb_sharegab.checked = true;

	let child_div = document.createElement('div');
	child_div.appendChild(cb_sharegab);
	child_div.appendChild(cb_label);

	extras_item.appendChild(child_div);

	if (!gLoggedIntoGab) {
		extras_item.style.pointerEvents = "none";
		extras_item.style.opacity = "0.2";
		cb_label.textContent = "Not logged in @ gab.ai";
		cb_sharegab.checked = false;
	} else {
		extras_item.style.pointerEvents = "auto";
		extras_item.style.opacity = "1";
		extras_item.setAttribute("title", "Twitter2Gab");
	}
	return extras_item;
}

function createExtrasItem(id)
{
	let extras_item = document.createElement('span');
	extras_item.setAttribute("class", "TweetBoxExtras-item GabExtra");
	extras_item.setAttribute("t2g", "haxxed");

	let cb_label = document.createElement('label');
	cb_label.textContent = "  Post to gab.ai";
	cb_label.setAttribute("class","t2g-cb-label");
	cb_label.setAttribute("for", "post2gab-" + id);

	let cb_url_label = document.createElement('label');
	cb_url_label.textContent = "  With link";
	cb_url_label.setAttribute("class","t2g-cb-label");
	cb_url_label.setAttribute("for", "posturl2gab-" + id);

	let cb_postgab = document.createElement('input');
	cb_postgab.setAttribute("type", "checkbox");
	cb_postgab.setAttribute("class", "post2gab");
	cb_postgab.setAttribute("id", "post2gab-" + id);

	let cb_posturl = document.createElement('input');
	cb_posturl.setAttribute("type", "checkbox");
	cb_posturl.setAttribute("class", "posturl2gab");
	cb_posturl.setAttribute("id", "posturl2gab-" + id);

	if (gOptionIncludeUrl == true) cb_posturl.checked = true;

	let child_div = document.createElement('div');
	child_div.setAttribute('class', 'GabExtra');

	let child2_div = document.createElement('div');
	child2_div.setAttribute('class', 'GabExtra');

	child_div.appendChild(cb_postgab);
	child_div.appendChild(cb_label);

	child2_div.appendChild(cb_posturl);
	child2_div.appendChild(cb_url_label);

	extras_item.appendChild(child_div);
	extras_item.appendChild(child2_div);

	if (!gLoggedIntoGab) {
		extras_item.style.pointerEvents = "none";
		extras_item.style.opacity = "0.2";
		cb_label.textContent = "Not logged in @ gab.ai";
		cb_posturl.checked = false;
		cb_postgab.checked = false;
	} else {
		extras_item.style.pointerEvents = "auto";
		extras_item.style.opacity = "1";
		extras_item.setAttribute("title", "Twitter2Gab");
	}

	return extras_item;
}

/* ################################################################################################## */

function getTwitterUiScreenname()
{
	let dropdown = document.getElementById("user-dropdown");
	if (dropdown == null) return;
	let uname_udir = dropdown.getElementsByClassName("username u-dir")[0];
	if (uname_udir == null) return;
	if (uname_udir.textContent.indexOf("@") == 0) {
		gTwitterUiScreenname = uname_udir.textContent.substring(1);
		debugLog("screenname detected: " + gTwitterUiScreenname);
	}
}

/* ################################################################################################## */

function addCommentBoxMutationObserver(dialog_footer, comment_box, dialog_id)
{
	if (dialog_footer.getAttribute("t2g-observed") == null)
	{
		dialog_footer.setAttribute("t2g-observed", "hax");
		var config = { attributes: true, childList: false, characterData: false };
		var observer = new MutationObserver(function(mutations) 
		{
			// reduce spam, stop global warming
			if (gMutationTimeoutId != null) window.clearTimeout(gMutationTimeoutId);
				gMutationTimeoutId = window.setTimeout(function() { modifyRetweetDialog(dialog_id) }, 420);
		});
		observer.observe(comment_box, config);
	}
}

var gDoneSetShareRtDefault = false;

function setShareRtCheckbox(dialog_footer)
{
	let s2g_cb = dialog_footer.getElementsByClassName("share2gab")[0];
	if (s2g_cb != null && gDoneSetShareRtDefault == false) 
	{
		gDoneSetShareRtDefault = true;
		if (gOptionShareRt) s2g_cb.checked = true;
		else s2g_cb.checked = false;
	}
}

function addT2gExtra(dialog_id, is_retweet)
{
	var add_extras_element = null;
	var is_reply = false;
	var t2g_cb_replies = null;
	if (is_retweet)
	{
		let dialog_footer = dialog_id.getElementsByClassName("RetweetDialog-footer u-cf")[0];
		if (dialog_footer == null) return; // this shouldn't happen
		var comment_box = document.getElementById("retweet-with-comment");
		addCommentBoxMutationObserver(dialog_footer, comment_box, dialog_id);
		setShareRtCheckbox(dialog_footer);
		if (comment_box.textContent == "") 
		{
			if (dialog_id.getElementsByClassName("share2gab")[0] == null)
			{
				if (dialog_id.getElementsByClassName("post2gab")[0] != null)
				{
					let remove_nodes = dialog_id.getElementsByClassName("TweetBoxExtras-item");
					for (let i=0; i<remove_nodes.length; i++)
					{
						if (remove_nodes[i].getAttribute("t2g") != null)
						{
							remove_nodes[i].parentNode.removeChild(remove_nodes[i]);
							break;
						}
					}
				}
				let s2g_ele = createShareToGabItem(getTimestamp());
				dialog_footer.appendChild(s2g_ele);
			} else {
				// wat
			}
		} else {
			if (dialog_id.getElementsByClassName("post2gab")[0] == null)
			{
				let t2g_extra = dialog_id.getElementsByClassName("share2gab")[0];
				if (t2g_extra != null)
				{
					let remove_node = dialog_id.parentNode.parentNode.getElementsByClassName("Share2Gab-item")[0];
					if (remove_node != null)
					{
						remove_node.parentNode.removeChild(remove_node);
					}
				}
				add_extras_element = dialog_footer;
			} else {
				// wat
			} 
		}
	} else {
		let tweet_box_extras = dialog_id.getElementsByClassName("TweetBoxExtras tweet-box-extras")[0];
		if (tweet_box_extras == null)
		{
			debugLog("fail addT2gExtra");
			return;
		}
		t2g_cb_replies = tweet_box_extras.getElementsByClassName("post2gab")[0];
		if (t2g_cb_replies == null) add_extras_element = tweet_box_extras;
		is_reply = true;
		let modal_draggable = tweet_box_extras.parentNode.parentNode.parentNode.parentNode.parentNode;
		if (modal_draggable.className == "modal draggable")
		{
			let usernames = modal_draggable.getElementsByClassName("username u-dir")[0];
			if (usernames == null || usernames.innerHTML == "@<b></b>") is_reply = false;
			if (is_reply == true) debugLog("this is a reply");
		}
	}
	if  (add_extras_element != null)
	{
		let extra = createExtrasItem(getTimestamp());
		add_extras_element.appendChild(extra);
		t2g_cb_replies = extra.getElementsByClassName("post2gab")[0];
	}
	if (t2g_cb_replies != null)
	{
		if (is_reply && !gOptionPostreplies) t2g_cb_replies.checked = false;
		else t2g_cb_replies.checked = true;
	}
}

function modifyPermalinkOverlay(overlay_id)
{
	gMutationTimeoutId = null;
	// overlay_id probably doesn't exist anymore, so get new element
	var pod = document.getElementById("permalink-overlay");
	if (pod == null) return; 
	var irt = pod.getElementsByClassName("inline-reply-tweetbox swift")[0];
	if (irt != null) {
		modifyInlineReplyBox(irt);
	}
}

// detect changes to tweet dialogs and modify them
function monitorTweetDialogs()
{
	var rtd = document.getElementById("retweet-tweet-dialog");
	var gtd = document.getElementById("global-tweet-dialog");
	var pod = document.getElementById("permalink-overlay");
	var irt = null;
	if (pod != null) irt = pod.getElementsByClassName("inline-reply-tweetbox swift")[0];
	var config = { attributes: true, childList: false };
	var timeout_millis = 50;
	if (rtd != null)
	{
		var observer = new MutationObserver(function(mutations) 
		{
			// reduce spam, stop global warming
			if (gMutationTimeoutId != null) window.clearTimeout(gMutationTimeoutId);
			gMutationTimeoutId = window.setTimeout(function() { modifyRetweetDialog(rtd) }, timeout_millis);
		});
		observer.observe(rtd, config);
	}
	if (gtd != null)
	{
		var observer = new MutationObserver(function(mutations) {
		// reduce spam, stop global warming
			if (gMutationTimeoutId != null) window.clearTimeout(gMutationTimeoutId);
			gMutationTimeoutId = window.setTimeout(function() { modifyTweetDialog(gtd) }, timeout_millis);
		});
		observer.observe(gtd, config);
	}
	if (irt != null)
	{
		modifyInlineReplyBox(irt)
	} 
	if (pod != null) 
	{
		// may have to make this a global var and replace element once mutation was triggered
		var observer = new MutationObserver(function(mutations) {
		// reduce spam, stop global warming
			if (gMutationTimeoutId != null) window.clearTimeout(gMutationTimeoutId);
			gMutationTimeoutId = window.setTimeout(function() { modifyPermalinkOverlay(pod) }, 1420); // higher delay may be unnecessary - test me
		});
		observer.observe(pod, config);
	}
}

/* ################################################################################################## */

function modifyRetweetDialog(dialog_id)
{
	gMutationTimeoutId = null;
	addT2gExtra(dialog_id, true);
	addButtListener(dialog_id);
}

function modifyTweetDialog(dialog_id)
{
	gMutationTimeoutId = null;
	addT2gExtra(dialog_id, false);
	addButtListener(dialog_id);
}

function modifyInlineReplyBox(dialog_id)
{
	addT2gExtra(dialog_id, false);
	addButtListener(dialog_id);
}

/* ################################################################################################## */

function addButtListener(dialog_id)
{
	var butt = dialog_id.getElementsByClassName("tweet-button")[0];
	if (butt.getAttribute("t2g_butt") != null) return;
	butt.setAttribute("t2g_butt", "haxxed");
	butt.addEventListener("click", function() { handleTweetbuttClick(butt) });
}

function handleTweetbuttClick(ele)
{
	gDoneSetShareRtDefault = false;
	let modal_title = ele.parentNode.parentNode.parentNode.getElementsByClassName("modal-title")[0];

	if (modal_title != null && modal_title.textContent.indexOf("Retweet") == 0) // this is a retweet dialog + RT
	{
		let s2g_cb = ele.parentNode.getElementsByClassName("share2gab")[0];
		if (s2g_cb != null)
		{
			if (s2g_cb.checked == true)
			{
				let rt_body = document.getElementById("retweet-tweet-dialog-body");
				if (rt_body != null)
				{
					let txt_container = rt_body.getElementsByClassName("js-tweet-text-container")[0];
					let txt = txt_container.textContent;
					let divs = rt_body.getElementsByTagName("div");
					
					let tweet_data_div = null;
					for(let i=0; i<divs.length; i++)
					{
						if (divs[i].getAttribute("data-screen-name") != null) {
							tweet_data_div = divs[i];
							break;
						}
					}
					if (tweet_data_div != null)
					{
						let permalink = "https://twitter.com" + tweet_data_div.getAttribute("data-permalink-path");
						let sname = tweet_data_div.getAttribute("data-screen-name");

						if (txt.indexOf(" pic.twitter.com") != -1)
						{
							txt = txt.replace(" pic.twitter.com", " https://pic.twitter.com");
						}

						browser.runtime.sendMessage({
							retweet: permalink,
							screenname: sname,
							text: txt
					  	});
					}
				}
			}
		}
	} else { // this is not a retweet dialog or not a RT
		let parent = ele.parentNode.parentNode.parentNode;
		let cb_posturl = parent.getElementsByClassName("posturl2gab")[0];
		let cb_postgab = parent.getElementsByClassName("post2gab")[0];
		if (cb_posturl == null)
		{
			console.error("dafuq: cb_posturl fail");
			if (cb_postgab == null) return;
		}

		browser.runtime.sendMessage({
			tweetbutt: "clicked",
			screenname: gTwitterUiScreenname,
			tiem: getTimestamp(),
			posturl: cb_posturl.checked,
			postgab: cb_postgab.checked
	  	});
	}
}

/* ################################################################################################## */

// unused
function handleResponse(message) 
{
	if (message.gabloggedin != null)
	{
		// fix me
		//gLoggedIntoGab = message.gabloggedin;
		gLoggedIntoGab = true;
	}
}

function isGabLoggedIn() {
  let sending = browser.runtime.sendMessage({
  	gabloggedin: "praise kek",
  	screenname: gTwitterUiScreenname
  });
  sending.then(handleResponse, null);  
}

/* ################################################################################################## */
/* ################################################################################################## */
/* ################################################################################################## */

async function init()
{
	await getOptionsStorage();
	isGabLoggedIn();
	getTwitterUiScreenname();
	monitorTweetDialogs();
}

init();

/* ################################################################################################## */
/* ################################################################################################## */
/* ################################################################################################## */
