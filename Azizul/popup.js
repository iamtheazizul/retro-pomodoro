if (typeof browser === "undefined") {
  var browser = chrome;
}

// Elements
const tabTimerBtn = document.getElementById("tabTimerBtn");
const tabSettingsBtn = document.getElementById("tabSettingsBtn");
const tabTimer = document.getElementById("tabTimer");
const tabSettings = document.getElementById("tabSettings");

const workInput = document.getElementById("work-duration");
const breakInput = document.getElementById("break-duration");
const startBtn = document.getElementById("start");
const pauseBtn = document.getElementById("pause");
const resetBtn = document.getElementById("reset");
const saveBtn = document.getElementById("save");
const timerLabel = document.getElementById("timer");
// const statusLabel = document.getElementById("status");
const skipBtn = document.getElementById("skip");

let timerRunning = false;

// Tab switching functions
function switchTab(tabName) {
  if (tabName === "timer") {
    tabTimer.style.display = "block";
    tabSettings.style.display = "none";
    tabTimerBtn.classList.add("active");
    tabSettingsBtn.classList.remove("active");
  } else if (tabName === "settings") {
    tabTimer.style.display = "none";
    tabSettings.style.display = "block";
    tabTimerBtn.classList.remove("active");
    tabSettingsBtn.classList.add("active");
  }
}

// Add tab click event listeners
tabTimerBtn.addEventListener("click", () => switchTab("timer"));
tabSettingsBtn.addEventListener("click", () => switchTab("settings"));
skipBtn.addEventListener("click", () => {
  sendMessage("skip");
});


// Convert seconds to MM:SS format
function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

let storedWorkDuration = 25 * 60;   // fallback default in seconds
let storedBreakDuration = 5 * 60;   // fallback default in seconds

const upcomingLabel = document.getElementById("upcoming");

// Load saved durations into inputs and variables
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

// Update UI from background
function updateDisplay({ remainingSeconds, isWorking, timerRunning: running }) {
  timerLabel.textContent = formatTime(remainingSeconds);
  // statusLabel.textContent = `Status: ${isWorking ? "Working" : "Break"}`;
  timerRunning = running;

  // Disable inputs if running
  workInput.disabled = running;
  breakInput.disabled = running;
  saveBtn.disabled = running;

  // Update upcoming label
  if (!running) {
    upcomingLabel.textContent = "";
  } else {
    if (isWorking) {
      // Currently working → upcoming break
      let breakMins = Math.floor(storedBreakDuration / 60);
      upcomingLabel.textContent = `Upcoming: Break ${breakMins} minute${breakMins !== 1 ? "s" : ""}`;
    } else {
      // Currently on break → upcoming work
      let workMins = Math.floor(storedWorkDuration / 60);
      upcomingLabel.textContent = `Upcoming: Work ${workMins} minute${workMins !== 1 ? "s" : ""}`;
    }
  }
}
// Send messages to background
function sendMessage(action, data = {}) {
  return browser.runtime.sendMessage({ action, ...data });
}

// Button event handlers
startBtn.addEventListener("click", () => {
  sendMessage("start");
});

pauseBtn.addEventListener("click", () => {
  sendMessage("pause");
});

resetBtn.addEventListener("click", () => {
  sendMessage("reset");
});

saveBtn.addEventListener("click", () => {
  const work = Number(workInput.value);
  const brk = Number(breakInput.value);
  if (work < 1 || brk < 1) {
    alert("Durations must be at least 1 minute");
    return;
  }
  sendMessage("saveDurations", { workDuration: work, breakDuration: brk });
  alert("Settings saved!");
});

// Listen for status updates from background
browser.runtime.onMessage.addListener((message) => {
  if (message.action === "timerUpdate") {
    updateDisplay(message);
  }
});

// Initialize popup
loadSavedDurations();
sendMessage("pause"); // Ask background to send current status
switchTab("timer"); // default tab