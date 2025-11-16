if (typeof browser === "undefined") {
  var browser = chrome;
}

let workDuration = 25 * 60;
let breakDuration = 5 * 60;
let cycles = 1;
let currentCycle = 0;
let isWorking = true;
let timerRunning = false;
let remainingSeconds = workDuration;
let timerInterval = null;

// Load saved preferences on start
browser.storage.local.get(["workDuration", "breakDuration", "cycles"]).then((result) => {
  if (result.workDuration) workDuration = result.workDuration;
  if (result.breakDuration) breakDuration = result.breakDuration;
  if (result.cycles) cycles = result.cycles;
  remainingSeconds = isWorking ? workDuration : breakDuration;
});

function sendStatus() {
  browser.runtime.sendMessage({
    action: "timerUpdate",
    remainingSeconds,
    isWorking,
    timerRunning,
    currentCycle,
    totalCycles: cycles
  }).catch(() => {
    // Popup might be closed, ignore error
  });
}

function startTimer() {
  if (timerRunning) return;
  
  // If starting fresh (currentCycle is 0), set to cycle 1
  if (currentCycle === 0) {
    currentCycle = 1;
    isWorking = true;
    remainingSeconds = workDuration;
  }
  
  timerRunning = true;
  sendStatus();

  timerInterval = setInterval(() => {
    if (remainingSeconds > 0) {
      remainingSeconds--;
      sendStatus();
    } else {
      // Session complete
      if (isWorking) {
        notify("Work session complete!", "Time for a break.");
        playSound();
        
        // Switch to break
        isWorking = false;
        remainingSeconds = breakDuration;
        sendStatus();
      } else {
        // Break complete
        notify("Break is over!", "Time to get back to work.");
        playSound();
        
        // Check if we've completed all cycles
        if (currentCycle >= cycles) {
          // All cycles complete - stop timer
          notify("All cycles complete!", "Great job! Timer has stopped.");
          pauseTimer();
          currentCycle = 0;
          isWorking = true;
          remainingSeconds = workDuration;
          sendStatus();
          return;
        }
        
        // Move to next cycle
        currentCycle++;
        isWorking = true;
        remainingSeconds = workDuration;
        sendStatus();
      }
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
  currentCycle = 0;
  isWorking = true;
  remainingSeconds = workDuration;
  sendStatus();
}

function saveDurations(workMin, breakMin, cycleCount) {
  workDuration = workMin * 60;
  breakDuration = breakMin * 60;
  cycles = cycleCount;

  browser.storage.local.set({
    workDuration,
    breakDuration,
    cycles
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

// function skipSession() {
//   if (!isWorking) {
//     // Can only skip during break time
//     pauseTimer();
    
//     // Check if we've completed all cycles
//     if (currentCycle >= cycles) {
//       // All cycles complete
//       notify("All cycles complete!", "Great job! Timer has stopped.");
//       currentCycle = 0;
//       isWorking = true;
//       remainingSeconds = workDuration;
//       sendStatus();
//       return;
//     }
    
//     // Move to next cycle
//     currentCycle++;
//     isWorking = true;
//     remainingSeconds = workDuration;
//     sendStatus();
//     startTimer();
//   }
// }

function skipSession() {
  if (isWorking) {
    // Skip work session - go to break
    pauseTimer();
    isWorking = false;
    remainingSeconds = breakDuration;
    notify("Work session skipped", "Starting break time.");
    sendStatus();
    startTimer();
  } else {
    // Skip break session - go to next cycle or finish
    pauseTimer();
    
    // Check if we've completed all cycles
    if (currentCycle >= cycles) {
      // All cycles complete
      notify("All cycles complete!", "Great job! Timer has stopped.");
      currentCycle = 0;
      isWorking = true;
      remainingSeconds = workDuration;
      sendStatus();
      return;
    }
    
    // Move to next cycle
    currentCycle++;
    isWorking = true;
    remainingSeconds = workDuration;
    notify("Break skipped", "Starting next work session.");
    sendStatus();
    startTimer();
  }
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
      saveDurations(message.workDuration, message.breakDuration, message.cycles);
      break;
    case "skip":
      skipSession();
      break;
    case "getStatus":
      sendStatus();
      break;
    case "getBlockStatus":
      // Content scripts ask whether to block now
      sendResponse({ 
        shouldBlock: timerRunning && isWorking, 
        remainingSeconds,
        timerRunning: timerRunning
      });
      return true;
    case "getBreakStatus":
      // Content scripts ask whether it's break time
      sendResponse({ 
        isBreak: !isWorking, 
        timerRunning: timerRunning,
        remainingSeconds: remainingSeconds 
      });
      return true;
    case "blockedSitesUpdated":
      // Notify content scripts to re-check immediately
      browser.runtime.sendMessage({ action: "blockStatusChanged" }).catch(() => {});
      break;
  }
  sendResponse({});
  return true;
});