if (typeof browser === "undefined") {
  var browser = chrome;
}

let workDuration = 25 * 60;
let breakDuration = 5 * 60;
let isWorking = true;
let timerRunning = false;
let remainingSeconds = workDuration;
let timerInterval = null;

// Load saved preferences on start
browser.storage.local.get(["workDuration", "breakDuration"]).then((result) => {
  if (result.workDuration) workDuration = result.workDuration;
  if (result.breakDuration) breakDuration = result.breakDuration;
  remainingSeconds = isWorking ? workDuration : breakDuration;
});

function sendStatus() {
  browser.runtime.sendMessage({
    action: "timerUpdate",
    remainingSeconds,
    isWorking,
    timerRunning
  }).catch(() => {
    // Popup might be closed, ignore error
  });
}

function startTimer() {
  if (timerRunning) return;
  timerRunning = true;
  sendStatus();

  timerInterval = setInterval(() => {
    if (remainingSeconds > 0) {
      remainingSeconds--;
      sendStatus();
    } else {
      if (isWorking) {
        notify("Work session complete!", "Time for a break.");
      } else {
        notify("Break is over!", "Time to get back to work.");
      }
      playSound();
      isWorking = !isWorking;
      remainingSeconds = isWorking ? workDuration : breakDuration;
      sendStatus();
    }
  }, 1000);
}

function pauseTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
    timerRunning = false;
    sendStatus();
  }
}

function resetTimer() {
  pauseTimer();
  isWorking = true;
  remainingSeconds = workDuration;
  sendStatus();
}

function saveDurations(workMin, breakMin) {
  workDuration = workMin * 60;
  breakDuration = breakMin * 60;

  browser.storage.local.set({
    workDuration,
    breakDuration
  });

  // Only reset if timer is not running
  if (!timerRunning) {
    remainingSeconds = isWorking ? workDuration : breakDuration;
  }
  sendStatus();
}

function notify(title, message) {
  browser.notifications.create({
    type: "basic",
    iconUrl: browser.runtime.getURL("icons/icon48.png"),
    title,
    message
  });
}

function playSound() {
  let audio = new Audio(browser.runtime.getURL("sounds/ding.mp3"));
  audio.play().catch(() => {});
}

function skipSession() {
  pauseTimer();
  isWorking = !isWorking;
  remainingSeconds = isWorking ? workDuration : breakDuration;
  sendStatus();
  startTimer();
}

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case "start":
      startTimer();
      break;
    case "pause":
      pauseTimer();
      break;
    case "reset":
      resetTimer();
      break;
    case "saveDurations":
      saveDurations(message.workDuration, message.breakDuration);
      break;
    case "skip":
      skipSession();
      break;
    case "getStatus":
      sendStatus();
      break;
    case "getBlockStatus":
      // Content scripts ask whether to block now
      sendResponse({ shouldBlock: timerRunning && isWorking, remainingSeconds });
      return true;
    case "blockedSitesUpdated":
      // Notify content scripts to re-check immediately
      browser.runtime.sendMessage({ action: "blockStatusChanged" }).catch(() => {});
      break;
  }
  sendResponse({});
  return true;
});