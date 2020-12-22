const spanSelector =
  '#mount_0_0 > div > div:nth-child(1) > div.rq0escxv.l9j0dhe7.du4w35lb > div:nth-child(7) > div > div > div.rq0escxv.l9j0dhe7.du4w35lb > div > div.j83agx80.cbu4d94t.h3gjbzrl.l9j0dhe7.du4w35lb.qsy8amke > div.dp1hu0rb.cbu4d94t.j83agx80 > div > div > div.j83agx80.cbu4d94t.buofh1pr.nnvw5wor.gs1a9yip.taijpn5t > div > div > div > div > div > div > div:nth-child(2) > div > div.__fb-dark-mode > div > div > div > div.rq0escxv.l9j0dhe7.du4w35lb.d2edcug0.hpfvmrgz.ovwxwvn6.buofh1pr.g5gj957u.aov4n071.oi9244e8.bi6gxh9e.h676nmdw.aghb5jc5 > div.oajrlxb2.g5ia77u1.qu0x051f.esr5mh6w.e9989ue4.r7d6kgcz.rq0escxv.nhd2j8a9.nc684nl6.p7hjln8o.kvgmc6g5.cxmmr5t8.oygrvhab.hcukyx3x.jb3vyjys.rz4wbd8a.qt6c0cv9.a8nywdso.i1ao9s8h.esuyzwwr.f1sip0of.lzcic4wl.gmql0nx0.gpro0wi8 > div > span';
let lastLocation = '';
let handledLastLocation = false;
let intervalID;
let settings = { intervalDelay: 3000, on: true };
/** @type HTMLVideoElement[] */
let lastVidList;

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

function clickCancel(retry = true) {
  let spanList  = document.querySelectorAll(spanSelector);
  if (!spanList.length) { // if we can't find it via the spanSelector, just try to find a span with the text 'cancel'
    if (!retry) {
      console.warn("didn't find the cancel element, returning")
      return false;
    }
    console.warn("didn't find the cancel element with selector, trying to search all spans")
    spanList = document.querySelectorAll('span');
  }
  // filter to spans that contain the word 'cancel'
  spanList = Array.from(spanList).filter(s => /cancel/i.test(s.innerText));
  if (!spanList.length) {
    console.error('stop next video: didn\'t find the \'cancel\' span');
    return false;
  }
  if(spanList.length > 1){
    // if there's more than one span with the word cancel - then something is wrong
    console.warn("found more than one span with the word cancel, returning", spanList);
    return false;
  }
  let span = spanList[0];
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
  if (vidList.length > 1) {
    console.warn(
      `Expected only one video, got ${vidList.length}, listening to all`,
      vidList);
  }
  vidList.forEach((v) => v.addEventListener('ended', clickCancel));
  lastVidList = vidList;
}



function injectCss() {
  css.innerHTML =
     "#mount_0_0 > div > div:nth-child(1) > div.rq0escxv.l9j0dhe7.du4w35lb > div:nth-child(7) > div > div > div.rq0escxv.l9j0dhe7.du4w35lb > div > div.j83agx80.cbu4d94t.h3gjbzrl.l9j0dhe7.du4w35lb.qsy8amke > div.dp1hu0rb.cbu4d94t.j83agx80 > div > div > div.j83agx80.cbu4d94t.buofh1pr.nnvw5wor.gs1a9yip.taijpn5t > div > div > div > div > div > div > div:nth-child(2) > div > div.__fb-dark-mode > div{display: none !important;}";
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
  lastVidList &&
    lastVidList.forEach((v) => v.removeEventListener('ended', clickCancel));
}

storageGet('settings', (items) => {
  Object.assign(settings, items.settings);
  settings.on !== false ? setOn() : setOff();
});

// listens for messages from options || popup.html (for now just turning the
// extension on and off)
(chrome || browser)
  .runtime.onMessage.addListener(function (msg, sender, sendResponse) {
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