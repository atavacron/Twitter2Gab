/* ################################################################################################## */
/* ################################################################################################## */
/* ################################################################################################## */

const VERSION = browser.runtime.getManifest().version;

var gIframe = null;
var gTimeOutId = null;
var gPopupParams = null;

/* ################################################################################################## */
/* ################################################################################################## */
/* ################################################################################################## */

function listenToMessages()
{
	browser.runtime.onMessage.addListener(request => {
		if (request.popup != null)
		{
			gPopupParams = {
				header: request.header, 
				text: request.text, 
				url: request.url,
				footer: "=[ Twitter2Gab v" + VERSION + "]=",
				timeout_millis: request.timeout_millis
			};
			preparePopup();
		} 
	}); 
}

/* ################################################################################################## */

function createIframe()
{
	let popurl = browser.extension.getURL("popup.html");
	let fill_screen = document.createElement("div");
	fill_screen.setAttribute("id", "t2g_fill")
	let div_ifr = document.createElement("div");
	let ifr = document.createElement("iframe");
	ifr.setAttribute("src", popurl);
	ifr.setAttribute("scrolling", "no");
	ifr.setAttribute("frameborder", "0px");
	ifr.setAttribute("class", "t2g-pop-iframe");
	fill_screen.setAttribute("class", "t2g-pop-fill");
	fill_screen.addEventListener("click", function() { closePopup() });
	div_ifr.setAttribute("class", "t2g-pop-div-ifr");
	div_ifr.appendChild(ifr);
	fill_screen.appendChild(div_ifr);
	document.body.appendChild(fill_screen);
	return ifr;
}

function waitIframeLoaded()
{
	gIframe.addEventListener("load", function() {
		var y = (gIframe.contentWindow || gIframe.contentDocument);
		if (y.document) y = y.document;
		displayPopup(y); 
	});
}

/* ################################################################################################## */

function preparePopup()
{
	if (gIframe == null)
	{
		gIframe = createIframe();
	} 
	waitIframeLoaded();
}

function displayPopup(doc)
{
	let t2g_fill = document.getElementById("t2g_fill");
	let pop_body = doc.getElementById("t2g_popup_body");
	let pop_header = doc.getElementById("t2g_popup_header");
	let pop_footer = doc.getElementById("t2g_popup_footer");

	pop_body.textContent = gPopupParams.text;
	pop_header.textContent = gPopupParams.header;
	pop_footer.textContent = gPopupParams.footer;

	if (gPopupParams.url != null)
	{
		let pop_link = doc.getElementById("t2g_popup_link");
		pop_link.textContent = gPopupParams.url;
		pop_link.title = gPopupParams.url;
		pop_link.style.visibility = "visible";
		pop_link.addEventListener("click", function() {
			window.open(gPopupParams.url,'_blank');
			closePopup();
		});
	}
	t2g_fill.style.visibility = "visible";
	gTimeOutId = window.setTimeout(function() { closePopup() }, gPopupParams.timeout_millis);
}

function closePopup()
{
	if (gTimeOutId != null) window.clearTimeout(gTimeOutId);
	gTimeOutId = null;

	let t2g_fill = document.getElementById("t2g_fill");
	t2g_fill.parentNode.removeChild(t2g_fill);

	gIframe = null;
}

/* ################################################################################################## */
/* ################################################################################################## */
/* ################################################################################################## */

listenToMessages();

/* ################################################################################################## */
/* ################################################################################################## */
/* ################################################################################################## */
