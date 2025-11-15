if (typeof browser === "undefined") {
  var browser = chrome;
}

const workInput = document.getElementById("work-duration");
const breakInput = document.getElementById("break-duration");
const startBtn = document.getElementById("start");
const pauseBtn = document.getElementById("pause");
const resetBtn = document.getElementById("reset");
const saveBtn = document.getElementById("save");
const timerLabel = document.getElementById("timer");
const statusLabel = document.getElementById("status");

let timerRunning = false;

// Convert seconds to MM:SS format
function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// Update UI from background
function updateDisplay({ remainingSeconds, isWorking, timerRunning: running }) {
  timerLabel.textContent = formatTime(remainingSeconds);
  statusLabel.textContent = `Status: ${isWorking ? "Working" : "Break"}`;
  timerRunning = running;

  // Disable inputs if running
  workInput.disabled = running;
  breakInput.disabled = running;
  saveBtn.disabled = running;
}

// Load saved durations into inputs
function loadSavedDurations() {
  browser.storage.local.get(["workDuration", "breakDuration"]).then(result => {
    if (result.workDuration) workInput.value = Math.floor(result.workDuration / 60);
    if (result.breakDuration) breakInput.value = Math.floor(result.breakDuration / 60);
  });
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
});

// Listen for status updates from background
browser.runtime.onMessage.addListener((message) => {
  if (message.action === "timerUpdate") {
    updateDisplay(message);
  }
});

// Initialize popup
loadSavedDurations();
// Ask background for current timer status by forcing an update
sendMessage("pause"); // Pause to trigger status update, could implement a "getStatus" instead if wanted