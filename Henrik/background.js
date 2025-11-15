let blockedSites = [];

// Load blocked sites from storage
browser.storage.local.get('blockedSites').then(result => {
    blockedSites = result.blockedSites || [];
    updateBlockingRules();
});

// Listen for storage changes
browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.blockedSites) {
        blockedSites = changes.blockedSites.newValue || [];
        updateBlockingRules();
    }
});

function updateBlockingRules() {
    // Remove existing listener if any
    if (browser.webRequest.onBeforeRequest.hasListener(blockRequest)) {
        browser.webRequest.onBeforeRequest.removeListener(blockRequest);
    }
    
    // Add new listener if there are blocked sites
    if (blockedSites.length > 0) {
        const urlPatterns = blockedSites.map(site => `*://*.${site}/*`);
        
        browser.webRequest.onBeforeRequest.addListener(
            blockRequest,
            { urls: urlPatterns },
            ["blocking"]
        );
    }
}

function blockRequest(details) {
    // Redirect to a blocked page
    return {
        redirectUrl: browser.runtime.getURL("blocked.html")
    };
}

// Message handler for popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getBlockedSites') {
        sendResponse({ sites: blockedSites });
    }
    return true;
});