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
const cycleInput = document.getElementById("cycle-count");
const workValue = document.getElementById("work-value");
const breakValue = document.getElementById("break-value");
const cycleValue = document.getElementById("cycle-value");
const totalTimeDisplay = document.getElementById("total-time-display");
const workMessage = document.getElementById("work-message");
const breakMessage = document.getElementById("break-message");

const startBtn = document.getElementById("start");
const pauseBtn = document.getElementById("pause");
const resetBtn = document.getElementById("reset");
const skipBtn = document.getElementById("skip");
const saveBtn = document.getElementById("save");
const timerLabel = document.getElementById("timer");
const upcomingLabel = document.getElementById("upcoming");
const cycleInfo = document.getElementById("cycleInfo");
const modeIndicator = document.getElementById("modeIndicator");

const blockedSitesInput = document.getElementById("blockedSitesInput");
const saveBlockedSitesBtn = document.getElementById("saveBlockedSitesBtn");

let timerRunning = false;
let storedWorkDuration = 25 * 60;
let storedBreakDuration = 5 * 60;
let storedCycles = 1;
let currentCycle = 0;
let totalCycles = 1;

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

function calculateTotalTime() {
  const work = Number(workInput.value);
  const brk = Number(breakInput.value);
  const cycles = Number(cycleInput.value);
  
  const totalMinutes = (work + brk) * cycles;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  
  if (hours > 0) {
    totalTimeDisplay.textContent = `${hours}h ${mins}min`;
  } else {
    totalTimeDisplay.textContent = `${mins} min`;
  }
}

function updateWorkMessage(minutes) {
  const messages = {
    5: "Baby steps! Rome wasn't built in a day 🏛️",
    10: "Quick burst of productivity! ⚡",
    15: "Sweet spot for staying fresh! 🌟",
    20: "Getting serious now! 🎯",
    25: "Classic Pomodoro - tried and true! 🍅",
    30: "Half hour of pure focus! 🔥",
    35: "Deep work territory! 🧠",
    40: "Marathon mode activated! 🏃",
    45: "You're a productivity machine! 🤖",
    50: "Almost a full hour - impressive! 💎",
    55: "Beast mode: ENGAGED! 🦁",
    60: "WOHOOO! You're absolutely LOCKED IN! 🚀"
  };
  
  workMessage.textContent = messages[minutes] || "Let's get things done! 💪";
}

function updateBreakMessage(minutes) {
  const messages = {
    5: "Quick recharge! ⚡",
    10: "Perfect mini-break! ☕",
    15: "Smart rest period! 🧘",
    20: "Generous breather! 🌈",
    25: "Self-care champion! 💚",
    30: "Thanks for being kind to yourself! 🌺"
  };
  
  breakMessage.textContent = messages[minutes] || "Rest well! 😌";
}

function validateBreakTime() {
  const work = Number(workInput.value);
  const brk = Number(breakInput.value);
  
  // Break time cannot be longer than work time
  if (brk > work) {
    breakInput.value = work;
    breakValue.textContent = work;
  }
}

function updateDisplay({ remainingSeconds, isWorking, timerRunning: running, currentCycle: cycle, totalCycles: total }) {
  timerLabel.textContent = formatTime(remainingSeconds);
  timerRunning = running;
  currentCycle = cycle || 0;
  totalCycles = total || storedCycles;

  workInput.disabled = running;
  breakInput.disabled = running;
  cycleInput.disabled = running;
  saveBtn.disabled = running;

  // Update cycle info
  cycleInfo.textContent = `Cycle ${currentCycle}/${totalCycles}`;

  // Show/hide skip button (only during break time)
  // if (running && !isWorking) {
  //   skipBtn.classList.remove("hidden");
  // } else {
  //   skipBtn.classList.add("hidden");
  // }

    // Show/hide skip button (during both work and break time)
  if (running) {
    skipBtn.classList.remove("hidden");
  } else {
    skipBtn.classList.add("hidden");
  }
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
  browser.storage.local.get(["workDuration", "breakDuration", "cycles"]).then(result => {
    if (result.workDuration) {
      const workMins = Math.floor(result.workDuration / 60);
      workInput.value = workMins;
      workValue.textContent = workMins;
      storedWorkDuration = result.workDuration;
      updateWorkMessage(workMins);
    }
    if (result.breakDuration) {
      const breakMins = Math.floor(result.breakDuration / 60);
      breakInput.value = breakMins;
      breakValue.textContent = breakMins;
      storedBreakDuration = result.breakDuration;
      updateBreakMessage(breakMins);
    }
    if (result.cycles) {
      cycleInput.value = result.cycles;
      cycleValue.textContent = result.cycles;
      storedCycles = result.cycles;
    }
    calculateTotalTime();
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

// Slider listeners
workInput.addEventListener("input", () => {
  const value = Number(workInput.value);
  workValue.textContent = value;
  updateWorkMessage(value);
  validateBreakTime();
  calculateTotalTime();
});

breakInput.addEventListener("input", () => {
  const value = Number(breakInput.value);
  breakValue.textContent = value;
  updateBreakMessage(value);
  validateBreakTime();
  calculateTotalTime();
});

cycleInput.addEventListener("input", () => {
  cycleValue.textContent = cycleInput.value;
  calculateTotalTime();
});

startBtn.addEventListener("click", () => sendMessage("start"));
pauseBtn.addEventListener("click", () => sendMessage("pause"));
resetBtn.addEventListener("click", () => sendMessage("reset"));
skipBtn.addEventListener("click", () => sendMessage("skip"));
saveBtn.addEventListener("click", () => {
  const work = Number(workInput.value);
  const brk = Number(breakInput.value);
  const cycles = Number(cycleInput.value);
  
  if (work < 5 || brk < 5) {
    alert("⚠ Durations must be at least 5 minutes!");
    return;
  }
  
  if (brk > work) {
    alert("⚠ Break time cannot be longer than work time!");
    return;
  }
  
  storedWorkDuration = work * 60;
  storedBreakDuration = brk * 60;
  storedCycles = cycles;
  
  sendMessage("saveDurations", { 
    workDuration: work, 
    breakDuration: brk,
    cycles: cycles
  });
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