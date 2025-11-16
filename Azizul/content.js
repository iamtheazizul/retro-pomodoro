if (typeof browser === "undefined") {
  var browser = chrome;
}

let overlay = null;
let overlayInterval = null;

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function startOverlayTimer() {
  stopOverlayTimer();

  overlayInterval = setInterval(() => {
    browser.runtime.sendMessage({ action: "getBlockStatus" }, (response) => {
      if (response && response.shouldBlock) {
        const timeElement = document.getElementById("pomodoro-remaining");
        if (timeElement) {
          timeElement.textContent = formatTime(response.remainingSeconds);
        }
      } else {
        hideOverlay();
      }
    });
  }, 1000);
}

function stopOverlayTimer() {
  if (overlayInterval) {
    clearInterval(overlayInterval);
    overlayInterval = null;
  }
}

function checkAndBlock() {
  const currentHost = window.location.hostname.replace(/^www\./, "").toLowerCase();

  browser.storage.local.get(["blockedSites"]).then(result => {
    const blockedSites = (result.blockedSites || []).map(s => s.toLowerCase());
    const isBlocked = blockedSites.some(site => site && (currentHost.includes(site) || site.includes(currentHost)));

    if (isBlocked) {
      browser.runtime.sendMessage({ action: "getBlockStatus" }, (response) => {
        if (response && response.shouldBlock) {
          showOverlay(response.remainingSeconds);
        } else {
          hideOverlay();
        }
      });
    } else {
      hideOverlay();
    }
  });
}

function showOverlay(remainingSeconds) {
  if (overlay) return;

  overlay = document.createElement("div");
  overlay.id = "pomodoro-block-overlay";
  overlay.style.zIndex = 2147483647;
  overlay.style.position = "fixed";
  overlay.style.top = 0;
  overlay.style.left = 0;
  overlay.style.right = 0;
  overlay.style.bottom = 0;
  overlay.style.background = "#0f0f0f";
  overlay.style.color = "#00ff00";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.fontFamily = "VT323, monospace";
  overlay.innerHTML = `
    <div style="text-align:center; padding:30px; max-width:720px;">
      <div style="font-size:48px;">⏱</div>
      <h1 style="font-size:36px; margin:8px 0;">FOCUS MODE ACTIVE</h1>
      <p>This site is blocked during work sessions</p>
      <div style="margin-top:18px; font-size:28px;" id="pomodoro-remaining">${formatTime(remainingSeconds)}</div>
      <div style="margin-top:8px; font-size:14px; opacity:0.8;">remaining in work session</div>
    </div>
  `;

  document.documentElement.appendChild(overlay);
  startOverlayTimer();
}

function hideOverlay() {
  if (overlay) {
    overlay.remove();
    overlay = null;
    stopOverlayTimer();
  }
}

browser.runtime.onMessage.addListener((message) => {
  if (message.action === "timerUpdate" || message.action === "blockStatusChanged" || message.action === "blockedSitesUpdated") {
    checkAndBlock();
  }
});

// Initial checks
checkAndBlock();
setInterval(checkAndBlock, 2000);