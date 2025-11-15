let blockedSites = [];

// Load blocked sites from storage
browser.storage.local.get('blockedSites').then(result => {
    blockedSites = result.blockedSites || [];
});

// Listen for storage changes
browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.blockedSites) {
        blockedSites = changes.blockedSites.newValue || [];
    }
});

// Message handler for content script
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'checkIfBlocked') {
        const url = message.url;
        const hostname = new URL(url).hostname;
        
        const isBlocked = blockedSites.some(site => {
            return hostname === site || hostname.endsWith('.' + site);
        });
        
        sendResponse({ blocked: isBlocked });
    }
    return true;
});