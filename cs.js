const spanSelector =
    'div._4n-p > div > div > div._64ge._4bl9 > div._64gk > a > span';
let lastLocation = '';
let handledLastLocation = false;
let intervalID;
let settings = {intervalDelay: 3000, on: true};
/** @type HTMLVideoElement */
let lastVid;

function storageGet(keys, cb) {
  if (chrome) {
    chrome.storage.local.get(keys, cb);
  } else {
    browser.storage.local.get(keys).then(cb);
  }
}
var css = document.createElement('style');
css.type = 'text/css';
document.head.appendChild(css);

function clickCancel() {
  let span = document.querySelector(spanSelector);
  if (!span) {
    return false;
  }
  span.click();
  console.log('next video stopped');
  return true;
}

function addVideoHook() {
  let vidList = document.querySelectorAll('video');
  if (vidList.length === 0) {
    let delay = 1000;
    console.log(`no video yet, retrying in ${delay} ms`);
    setTimeout(addVideoHook, delay);
    return;
  }
  if (vidList.length != 1) {
    console.error(`Error: expected only one video, got ${vidList.length}`);
    return;
  }
  lastVid = vidList[0];
  lastVid.addEventListener('ended', clickCancel);
}



function injectCss() {
  css.innerHTML =
      'div._4n-p > div > div._64gd.clearfix._ikh{display: none !important;}';
}
function clearCss() {
  css.innerHTML = '';
}



function poll() {
  if (location.pathname.indexOf('/videos/') < 0) {
    return;
  }
  if (location.pathname !== lastLocation) {
    lastLocation = location.pathname;
    addVideoHook();
    handledLastLocation = true;
    // in case it was a very short video and it already ended
    clickCancel();
  } else {
    if (handledLastLocation) {
      return;
    }
  }
}
function setOn() {
  clearInterval(intervalID);
  // poll once now
  poll();
  intervalID = setInterval(poll, settings.intervalDelay);
  injectCss();
}
function setOff() {
  clearInterval(intervalID);
  clearCss();
  lastVid && lastVid.removeEventListener('ended', clickCancel);
}

storageGet('settings', (items) => {
  Object.assign(settings, items.settings);
  settings.on !== false ? setOn() : setOff();
});

// listens for messages from options || popup.html (for now just turning the extension on
// and off)
(chrome || browser)
    .runtime.onMessage.addListener(function(msg, sender, sendResponse) {
      console.log('msg:', msg, sender);
      // if it's not from options.html - return
      if (sender.tab) {
        return;
      }
      if (msg.settings) {
        Object.assign(settings, msg.settings);
        settings.on ? setOn() : setOff();
      }
    });

// cover up cases when user goes back and forth
window.addEventListener('popstate', () => handledLastLocation = false)