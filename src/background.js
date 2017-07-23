/* 

Twitter2Gab by gab.ai/miraculix

*/

/* ################################################################################################## */
/* ################################################################################################## */
/* ################################################################################################## */

const DEBUG = false;

/* ################################################################################################## */

const VERSION = browser.runtime.getManifest().version;

var gPostTweetReplies = false;
var gIncludeTweetUrl = true;
var gPostMobile = false;
var gRedirectToGab = false;
var gShareRtOnGab = false;
var gConfirmationPopup = true;

var gTweetData = null;
var gTweetText = "";
var gTweetReqId = "";
var gWebuiTweetData = null;
var gTwitterScreenname = null;
var gLastTweetUrl = null;
var gLoggedIn2Gab = false;
//var gLastGabLoginCheck = 0;
//const gGabLoginCheckInterval = 7200;
var gCurrentTabId = null;

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

function initSettingsStorage()
{
  var gettingItem = browser.storage.local.get('includetweeturl');
  gettingItem.then((res) => {
    if (res.includetweeturl == null)
    {
      browser.storage.local.set({
        postreplies: gPostTweetReplies,
        sharert: gShareRtOnGab,
        opentab: gRedirectToGab,
        confirmationpopup: gConfirmationPopup,
        postmobile: gPostMobile,
        includetweeturl: gIncludeTweetUrl
      });
    } else readSettingsStorage();
  });
}

function readSettingsStorage()
{
  var gettingItem = browser.storage.local.get([
    'postreplies',
    'includetweeturl',
    'sharert',
    'postmobile',
    'confirmationpopup',
    'opentab'
  ]);
  gettingItem.then((res) => {
    gPostTweetReplies = res.postreplies || false;
    gIncludeTweetUrl = res.includetweeturl || true;
    gShareRtOnGab = res.sharert || false;
    gPostMobile = res.postmobile || false;
    gConfirmationPopup = res.confirmationpopup || true;
    gRedirectToGab = res.opentab || false;
  });
}

function logStorageChange(changes, area) {
  if (area == "local") readSettingsStorage();
}

/* ################################################################################################## */
// gab.ai stuff
/* ################################################################################################## */

// ############ fix me ################### 
var gLastRedirectTabOpened = 0;

function gabResponseReceived(x)
{

  if (x.status != 200)
  {
    popupOnActiveTab("ERROR", "Status: " + x.status + "\nCheck console (CTRL+SHIFT+J) for more infos", 15, null);
    console.error(x.responseText);
    return;
  }

  var result = x.responseText;
  var regex = /gab\.ai\/auth\/login/;
  var match = regex.exec(result);
  if (match != null) 
  {
    if (getTimestamp() - gLastRedirectTabOpened < 2) return; // dafuq does it produce 2 responses for one request?
    gLastRedirectTabOpened = getTimestamp();
    popupOnActiveTab("ERROR", "Gab not sent: Not logged in to Gab?", 15, null);
    browser.tabs.create({ url:"https://gab.ai" });
// ############ fix me ################### 
    gLoggedIn2Gab = false;
  } else {

    let response_json = null;
    try {
      response_json = JSON.parse(x.responseText);
    }
    catch(err)
    {
      popupOnActiveTab("ERROR", "Unknown error. Check console (CTRL+SHIFT+J) for more infos", 15, null);
      console.error(x.responseText);
    }

    if (response_json == null) return;

    if (response_json.state != null)
    {
      if (response_json.state == "error")
      {
        popupOnActiveTab("ERROR", "Unknown error. Check console (CTRL+SHIFT+J) for more infos", 15, null);
        console.error(response_json.body);
        console.error(response_json.message);
      } else console.error("gab.ai unknown state: " + x.responseText);
    }
    if (response_json.published_at != null) {
        let gab_url = "https://gab.ai/" + response_json.actuser.username + "/posts/" + response_json.post.id;
      if (gConfirmationPopup) popupOnActiveTab("SUCCESS", "Posted to gab.ai", 5, gab_url);
      if (gRedirectToGab) browser.tabs.create({ url: gab_url });
    } else 
    if (response_json.state == null) console.error("gab.ai unknown response: " + x.responseText);
    gLoggedIn2Gab = true;
  }
}

function xmlHttpReqWithUseragent(type, url, async)
{
  let x = new XMLHttpRequest();
  x.open(type, url, async);
  x.setRequestHeader("User-Agent", "Twitter2Gab v" + VERSION);
  return x;
}

function checkGabLoggedin()
{
  let xhr = xmlHttpReqWithUseragent("GET", "https://gab.ai/feed/api", true); // get (empty) feed of user named api
  xhr.onload = function () { gabResponseReceived(xhr); }
  xhr.send();
}

function postGab(text)
{
  let xhr = xmlHttpReqWithUseragent("POST", "https://gab.ai/posts", true);
  xhr.setRequestHeader("Content-type", "application/json");
  xhr.onload = function () { gabResponseReceived(xhr); }
  xhr.send(JSON.stringify({ 
    'body': text,
    'reply_to': "",
    'is_quote': 0,
    'gif': "",
    'category': null,
    'topic': null,
    'share_twitter': null,
    'share_facebook': null,
    'is_replies_disabled': false
  }));
}

function createGabText()
{
  let url = null;
  if (gLastTweetUrl != null) {
    url = gLastTweetUrl;
    gLastTweetUrl = null;
  }
  // this shouldn't happen
  if (gTweetData == null) return null;
  let txt = gTweetData[0];
  let reply_to_id = gTweetData[1];
  let tmp_txt = txt;
  if (gWebuiTweetData != null)
  {
    // this shouldn't happen
    if (getTimestamp() - gWebuiTweetData.tiem > 10) {
      gTweetData = null;
      gWebuiTweetData = null;
      return txt;
    }  
    if (gWebuiTweetData.postgab == false) {
      gTweetData = null;
      gWebuiTweetData = null;
      return null;
    } 
    if (gWebuiTweetData.posturl == true && url != null) {
      tmp_txt = txt + "\n" + url;
      if (tmp_txt.length <= 300) txt = tmp_txt;
    }
  } else {
    if (reply_to_id != null && gPostTweetReplies == false) return null;
    if (url != null) {
      tmp_txt = txt + "\n" + url;
      if (tmp_txt.length <= 300) txt = tmp_txt;
    }
  }
  gTweetData = null;
  gWebuiTweetData = null;
  if (txt.length > 300) txt = txt.substr(0, 299);
  return txt;
}

function sendTweetToGab()
{
  if (!gPostMobile && gWebuiTweetData == null) return;
  let gabtxt = createGabText();
  if (gabtxt != null) 
  {
    if (gabtxt.trim() == "") {
      popupOnActiveTab("WARNING", 
        "Empty text field not sent to gab.ai. Posting images is not supported yet.", 10, null);
    } else postGab(gabtxt);
  }
  gTweetData = null;
  gWebuiTweetData = null;
}

function haveUiDataSendGab()
{
  if (gTweetData == null) return;
  sendTweetToGab();
}

/* ################################################################################################## */
// Twitter stuff
/* ################################################################################################## */

function getTwitterScreenname()
{
  let xhr = new XMLHttpRequest()
  xhr.open("GET", "https://twitter.com/i/notifications", false);
  xhr.send();
  var regex = /class=\"current-user\" data-name=\"profile\">\s*<a href=\"\/([a-zA-Z0-9]*)\"/;
  var match = regex.exec(xhr.responseText);
  if (match != null && match[1] != null){
    debugLog("screen name detected: " + match[1]);
    return match[1];
  } else {
      console.error("Failed getting screenname");
      return null;
  }
}

function getLastTweetUrl(screenname)
{
  let xhr = new XMLHttpRequest()
  xhr.open("GET", "https://twitter.com/" + screenname + "/with_replies", false);
  xhr.send();
  var doc = document.implementation.createHTMLDocument("hax");
  // very unlikely (impossible?) possibility to produce malicious URL here, which would have to be clicked on
  // problem neutralized a few lines below
  doc.documentElement.innerHTML = xhr.responseText; 
  let stream_items = doc.getElementById("stream-items-id");

  if (stream_items != null)
  {
    let my_tweets = stream_items.getElementsByClassName("my-tweet");
    if  (my_tweets != null)
    {
      for (let i=0; i<my_tweets.length; i++)
      {
        let permalink = my_tweets[i].getAttribute("data-permalink-path");
        if (permalink != null)
        {
          // added regex because of unsafe assignment of innerHTML above 
          // to make it impossible for this function to return malicious URL
          let regex = /\/[a-zA-Z0-9_]*\/status\/\d*/;
          let match = regex.exec(permalink);
          if (match != null) return "https://twitter.com" + match[0];
        }
      }
    }
  }
  console.error("couldn't find any tweets to produce URL: getLastTweetUrl(" + screenname + ") - different contextual identity?");
  gTwitterScreenname = getTwitterScreenname();
  popupOnActiveTab("WARNING","Couldn't find URL of Tweet. Posting to gab.ai anyway", 15, null);
  return null;
}

function interceptTweet(requestDetails) 
{
  //if (getTimestamp() - gLastGabLoginCheck > gGabLoginCheckInterval) {
  //  gLastGabLoginCheck = getTimestamp();
  //  checkGabLoggedin();
  //}

  if (requestDetails.requestBody.formData != null)
  {
    var replyto_id = requestDetails.requestBody.formData.in_reply_to_status_id;
    gTweetData = new Array();
    gTweetData[0] = requestDetails.requestBody.formData.status[0];
    gTweetData[1] = requestDetails.requestBody.formData.in_reply_to_status_id;
    gTweetReqId = requestDetails.requestId;
    browser.webRequest.onResponseStarted.addListener(
      logTweetResponse,
      {urls: ["https://twitter.com/i/tweet/create"]}
    );
  } 
}

function logTweetResponse(responseDetails) 
{
  if (responseDetails.requestId == gTweetReqId)
  {
    browser.webRequest.onResponseStarted.removeListener(logTweetResponse);
    if (responseDetails.statusCode == 200) 
    {
      browser.alarms.clearAll();
      if ( (gWebuiTweetData == null && gIncludeTweetUrl && gTwitterScreenname != null) ||
           (gWebuiTweetData != null && gWebuiTweetData.posturl == true) )
      {
        browser.alarms.create('get_last_tweet', {when: Date.now() + 1337}); // get tweet url
      } else browser.alarms.create('restartAlarm', {when: Date.now() + 420}); // send tweet
    } else {
      console.error("Failed sending tweet");
      gTweetData = null;
      gWebuiTweetData = null;
    }
  } else console.error("You broke the interwebs, Quickfinger");
}

/* ################################################################################################## */
// tabs / popup
/* ################################################################################################## */

function getActiveTab()
{
  var querying = browser.tabs.query({currentWindow: true, active: true});
  querying.then(function(tabInfo) {
      if (tabInfo[0] == null) return; // dafuq
      if (tabInfo[0].id != null) gCurrentTabId = tabInfo[0].id;
  } , null);
}

function handleUpdatedTab(tabId, changeInfo, tabInfo)
{
  if (changeInfo.status == "complete") 
  {
    browser.pageAction.show(tabId);
    gCurrentTabId = tabId;
  }
}

function popupOnActiveTab(header, text, seconds_delay, url)
{
  if (gCurrentTabId != null) displayPopup(gCurrentTabId, 
  {
      url: url,
      head: header, 
      txt: text, 
      millis: seconds_delay * 1000 
  });
}

async function displayPopup(tab_id, params)
{
    browser.tabs.sendMessage(tab_id, {
      popup: true,
      header: params.head,
      text: params.txt,
      url: params.url,
      timeout_millis: params.millis
    });
}

/* ################################################################################################## */

function handleMessage(request, sender, sendResponse) 
{
  gCurrentTabId = sender.tab.id;
  if (request.tweetbutt != null)
  {
    gWebuiTweetData = request;
    if (request.screenname != "") gTwitterScreenname = request.screenname;
  } else
  if (request.gabloggedin != null)
  {
    if (request.screenname != "") gTwitterScreenname = request.screenname;
    sendResponse({
      gabloggedin: gLoggedIn2Gab
    });
  } else
  if (request.retweet != null)
  {
    let tmp_txt = "RT " + request.screenname + "\n" + request.text + "\n" + request.retweet;
    if (tmp_txt.length <= 300) postGab(tmp_txt);
    else {
      tmp_txt = "RT " + request.screenname + "\n" + request.text;
      if (tmp_txt.length <= 300) postGab(tmp_txt);
      else postGab(tmp_txt.substr(0,299));
    } 
  }
}

/* ################################################################################################## */

function alarmListener(alarm)
{
  createAlarm();
  if (alarm.name == "get_last_tweet")
  {
      gLastTweetUrl = getLastTweetUrl(gTwitterScreenname);
      if (gWebuiTweetData != null)
      {
            haveUiDataSendGab();
      }
  } else
  if (alarm.name == "restartAlarm")
  {
    if (gTweetData != null)
    {
      debugLog("got tweet data - preparing to send tweet2gab");
      sendTweetToGab();
    }
  }
}

function createAlarm()
{
  browser.alarms.create('restartAlarm', {delayInMinutes: 0.1});
}

/* ################################################################################################## */
/* ################################################################################################## */
/* ################################################################################################## */

browser.webRequest.onBeforeRequest.addListener(
  interceptTweet,
  {urls: ["https://twitter.com/i/tweet/create"]},
  ["requestBody"]
);

browser.pageAction.onClicked.addListener(function () { browser.runtime.openOptionsPage(); });
browser.alarms.onAlarm.addListener(alarmListener);
browser.tabs.onUpdated.addListener(handleUpdatedTab);
browser.runtime.onMessage.addListener(handleMessage);
browser.storage.onChanged.addListener(logStorageChange);

initSettingsStorage();
gTwitterScreenname = getTwitterScreenname();
//gLastGabLoginCheck = getTimestamp();
getActiveTab();

/* ################################################################################################## */
/* ################################################################################################## */
/* ################################################################################################## */
