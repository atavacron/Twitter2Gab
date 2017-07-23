function saveOptionsDelayed(e)
{
  window.setTimeout(function() { saveOptions(e); }, 500);
}

function saveOptions(e) 
{
  browser.storage.local.set({
    includetweeturl: document.querySelector("#include_tweet_url").checked,
    sharert: document.querySelector("#share_retweets").checked,
    opentab: document.querySelector("#open_tab").checked,
    postmobile: document.querySelector("#post_mobile").checked,
    confirmationpopup: document.querySelector("#confirmation_popup").checked,
    postreplies: document.querySelector("#post_replies").checked
  });
  e.preventDefault();
}

async function restoreOptions() 
{
  var settings = await browser.storage.local.get([
      'includetweeturl', 
      'postreplies', 
      'sharert', 
      'opentab', 
      'confirmationpopup',
      'postmobile'
  ]);
  document.querySelector("#include_tweet_url").checked = settings.includetweeturl || false;
  document.querySelector("#post_replies").checked = settings.postreplies || false;
  document.querySelector("#share_retweets").checked = settings.sharert || false;
  document.querySelector("#open_tab").checked = settings.opentab || false;
  document.querySelector("#post_mobile").checked = settings.postmobile || false;
  document.querySelector("#confirmation_popup").checked = settings.confirmationpopup || true;
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById("muh_form").addEventListener("click", saveOptionsDelayed);
