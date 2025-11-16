if (typeof browser === "undefined") {
  var browser = chrome;
}

// Elements
const tabTimerBtn = document.getElementById("tabTimerBtn");
const tabSettingsBtn = document.getElementById("tabSettingsBtn");
const tabBlockedSitesBtn = document.getElementById("tabBlockedSitesBtn");

const tabTimer = document.getElementById("tabTimer");
const tabSettings = document.getElementById("tabSettings");
const tabBlockedSites = document.getElementById("tabBlockedSites");

const workInput = document.getElementById("work-duration");
const breakInput = document.getElementById("break-duration");
const startBtn = document.getElementById("start");
const pauseBtn = document.getElementById("pause");
const resetBtn = document.getElementById("reset");
const skipBtn = document.getElementById("skip");
const saveBtn = document.getElementById("save");
const timerLabel = document.getElementById("timer");
const upcomingLabel = document.getElementById("upcoming");
const modeIndicator = document.getElementById("modeIndicator");

const blockedSitesInput = document.getElementById("blockedSitesInput");
const saveBlockedSitesBtn = document.getElementById("saveBlockedSitesBtn");

let timerRunning = false;
let storedWorkDuration = 25 * 60;
let storedBreakDuration = 5 * 60;

function switchTab(tabName) {
  tabTimer.style.display = "none";
  tabSettings.style.display = "none";
  tabBlockedSites.style.display = "none";

  tabTimerBtn.classList.remove("active");
  tabSettingsBtn.classList.remove("active");
  tabBlockedSitesBtn.classList.remove("active");

  if (tabName === "timer") {
    tabTimer.style.display = "block";
    tabTimerBtn.classList.add("active");
  } else if (tabName === "settings") {
    tabSettings.style.display = "block";
    tabSettingsBtn.classList.add("active");
  } else if (tabName === "blockedSites") {
    tabBlockedSites.style.display = "block";
    tabBlockedSitesBtn.classList.add("active");
  }
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function updateDisplay({ remainingSeconds, isWorking, timerRunning: running }) {
  timerLabel.textContent = formatTime(remainingSeconds);
  timerRunning = running;

  workInput.disabled = running;
  breakInput.disabled = running;
  saveBtn.disabled = running;

  // Update mode indicator
  if (!running) {
    modeIndicator.textContent = "READY";
    modeIndicator.className = "mode-indicator mode-ready";
    upcomingLabel.textContent = "Ready to start!";
    upcomingLabel.style.color = "#007000ff";
  } else if (isWorking) {
    modeIndicator.textContent = "WORK";
    modeIndicator.className = "mode-indicator mode-work";
    let breakMins = Math.floor(storedBreakDuration / 60);
    upcomingLabel.textContent = `Next: Break (${breakMins}min)`;
    upcomingLabel.style.color = "#02dcdcff";
  } else {
    modeIndicator.textContent = "BREAK";
    modeIndicator.className = "mode-indicator mode-break";
    let workMins = Math.floor(storedWorkDuration / 60);
    upcomingLabel.textContent = `Next: Work (${workMins}min)`;
    upcomingLabel.style.color = "#ff00ff";
  }
}

function sendMessage(action, data = {}) {
  return browser.runtime.sendMessage({ action, ...data }).catch(() => {});
}

function loadSavedDurations() {
  browser.storage.local.get(["workDuration", "breakDuration"]).then(result => {
    if (result.workDuration) {
      workInput.value = Math.floor(result.workDuration / 60);
      storedWorkDuration = result.workDuration;
    }
    if (result.breakDuration) {
      breakInput.value = Math.floor(result.breakDuration / 60);
      storedBreakDuration = result.breakDuration;
    }
  });
}

function loadBlockedSites() {
  browser.storage.local.get(["blockedSites"]).then(result => {
    blockedSitesInput.value = (result.blockedSites || []).join("\n");
  });
}

function saveBlockedSites() {
  const sites = blockedSitesInput.value
    .split("\n")
    .map(s => s.trim())
    .filter(Boolean);

  browser.storage.local.set({ blockedSites: sites }).then(() => {
    alert("✓ Blocked sites list saved!");
    browser.runtime.sendMessage({ action: "blockedSitesUpdated" }).catch(() => {});
  });
}

// Listeners
tabTimerBtn.addEventListener("click", () => switchTab("timer"));
tabSettingsBtn.addEventListener("click", () => switchTab("settings"));
tabBlockedSitesBtn.addEventListener("click", () => {
  switchTab("blockedSites");
  loadBlockedSites();
});

startBtn.addEventListener("click", () => sendMessage("start"));
pauseBtn.addEventListener("click", () => sendMessage("pause"));
resetBtn.addEventListener("click", () => sendMessage("reset"));
skipBtn.addEventListener("click", () => sendMessage("skip"));
saveBtn.addEventListener("click", () => {
  const work = Number(workInput.value);
  const brk = Number(breakInput.value);
  if (work < 1 || brk < 1) {
    alert("⚠ Durations must be at least 1 minute!");
    return;
  }
  storedWorkDuration = work * 60;
  storedBreakDuration = brk * 60;
  sendMessage("saveDurations", { workDuration: work, breakDuration: brk });
  alert("✓ Settings saved!");
});

saveBlockedSitesBtn.addEventListener("click", saveBlockedSites);

browser.runtime.onMessage.addListener((message) => {
  if (message.action === "timerUpdate") {
    updateDisplay(message);
  }
});

// Init
loadSavedDurations();
sendMessage("getStatus");
switchTab("timer");