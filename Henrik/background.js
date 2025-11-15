const STORAGE_KEY = "blockedDomains";

// Simple domain matcher
function extractHostname(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

async function getBlockedDomains() {
  const data = await browser.storage.local.get(STORAGE_KEY);
  return data[STORAGE_KEY] || [];
}

browser.webRequest.onBeforeRequest.addListener(
  async (details) => {
    // Only block top-level navigation
    if (details.type !== "main_frame") return;

    const hostname = extractHostname(details.url);
    if (!hostname) return;

    const blocked = await getBlockedDomains();

    // Exact domain match
    if (blocked.includes(hostname)) {
      console.log("Blocking:", details.url);
      return { cancel: true };
    }

    return;
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);

// Just for debug:
browser.runtime.onInstalled.addListener(() => {
  console.log("Site Blocker MV2 installed.");
});
