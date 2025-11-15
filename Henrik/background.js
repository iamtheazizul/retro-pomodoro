// background.js
// Responsible for keeping the dynamic declarativeNetRequest rules in sync
// with the user-configured block list stored in browser.storage.local.

const STORAGE_KEY = "blockedDomains";

// Build declarativeNetRequest rules from domain list
function buildRulesFromDomains(domains) {
  const rules = [];
  let idCounter = 1;
  for (const domain of domains) {
    const d = domain.trim().toLowerCase();
    if (!d) continue;

    // Use requestDomains + main_frame to block top-level navigations.
    // The rule id must be unique; we assign sequential ids.
    rules.push({
      id: idCounter++,
      priority: 1,
      action: { type: "block" },
      condition: {
        requestDomains: [d],
        resourceTypes: ["main_frame"]
      }
    });
  }
  return rules;
}

// Apply rules to declarativeNetRequest (replaces existing dynamic rules)
async function applyRulesForDomains(domains) {
  try {
    const rules = buildRulesFromDomains(domains);

    // First remove any existing dynamic rules (clear all)
    const existing = await browser.declarativeNetRequest.getDynamicRules();
    const existingIds = existing.map(r => r.id);
    if (existingIds.length) {
      await browser.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: existingIds,
        addRules: []
      });
    }

    // Add new rules
    if (rules.length) {
      await browser.declarativeNetRequest.updateDynamicRules({
        addRules: rules
      });
    }
    console.log("Applied DNR rules:", rules);
  } catch (err) {
    console.error("Failed to apply rules:", err);
  }
}

// Initialize: read stored domains and apply
async function init() {
  const data = await browser.storage.local.get(STORAGE_KEY);
  const domains = data[STORAGE_KEY] || [];
  await applyRulesForDomains(domains);
}

// Listen for storage changes (when options page updates the list)
browser.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[STORAGE_KEY]) {
    const newDomains = changes[STORAGE_KEY].newValue || [];
    applyRulesForDomains(newDomains);
  }
});

// Message API (optional) — options page can also ask to update immediately
browser.runtime.onMessage.addListener((message, sender) => {
  if (message && message.type === "apply-domains" && Array.isArray(message.domains)) {
    applyRulesForDomains(message.domains);
  }
});

// Run init on service worker start
init();
