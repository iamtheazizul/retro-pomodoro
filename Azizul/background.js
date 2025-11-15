if (typeof browser === "undefined") {
  var browser = chrome;
}
// Background script to handle the Pomodoro timer logic

let workDuration = 25 * 60; // default 25 mins
let breakDuration = 5 * 60; // default 5 mins

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

// Helper to send updated timer status to popup
function sendStatus() {
  browser.runtime.sendMessage({
    action: "timerUpdate",
    remainingSeconds,
    isWorking,
    timerRunning
  });
}

// Start the interval timer
function startTimer() {
  if (timerRunning) return;
  timerRunning = true;
  sendStatus();

  timerInterval = setInterval(() => {
    if (remainingSeconds > 0) {
      remainingSeconds--;
      sendStatus();
    } else {
      // Time's up - notify and switch modes
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

// Pause the timer
function pauseTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
    timerRunning = false;
    sendStatus();
  }
}

// Reset the timer and pause
function resetTimer() {
  pauseTimer();
  remainingSeconds = isWorking ? workDuration : breakDuration;
  sendStatus();
}

// Save durations from popup
function saveDurations(workMin, breakMin) {
  workDuration = workMin * 60;
  breakDuration = breakMin * 60;

  // Save to storage
  browser.storage.local.set({
    workDuration,
    breakDuration
  });

  // Reset timer with new duration
  remainingSeconds = isWorking ? workDuration : breakDuration;
  sendStatus();
}

// Notifications
function notify(title, message) {
  // Create notification
  browser.notifications.create({
    "type": "basic",
    "iconUrl": browser.runtime.getURL("icons/icon48.png"),
    "title": title,
    "message": message
  });
}

function playSound() {
  let audio = new Audio(browser.runtime.getURL("sounds/ding.mp3"));
  audio.play();
}

// Listen for messages from popup
browser.runtime.onMessage.addListener((message) => {
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
  }
});
