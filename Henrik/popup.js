const siteInput = document.getElementById('siteInput');
const addBtn = document.getElementById('addBtn');
const siteList = document.getElementById('siteList');
const emptyState = document.getElementById('emptyState');
const gameOverlayBtn = document.getElementById('gameOverlayBtn');

// Load and display blocked sites
function loadSites() {
    browser.storage.local.get('blockedSites').then(result => {
        const sites = result.blockedSites || [];
        displaySites(sites);
    });
}

function displaySites(sites) {
    siteList.innerHTML = '';
    
    if (sites.length === 0) {
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
        
        sites.forEach(site => {
            const li = document.createElement('li');
            li.className = 'site-item';
            li.innerHTML = `
                <span>${site}</span>
                <button class="remove-btn" data-site="${site}">Remove</button>
            `;
            siteList.appendChild(li);
        });
        
        // Add remove button listeners
        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', () => removeSite(btn.dataset.site));
        });
    }
}

function addSite() {
    let site = siteInput.value.trim();
    
    if (!site) return;
    
    // Remove protocol if present
    site = site.replace(/^https?:\/\//, '');
    // Remove www. if present
    site = site.replace(/^www\./, '');
    // Remove trailing slash
    site = site.replace(/\/$/, '');
    
    browser.storage.local.get('blockedSites').then(result => {
        const sites = result.blockedSites || [];
        
        if (!sites.includes(site)) {
            sites.push(site);
            browser.storage.local.set({ blockedSites: sites }).then(() => {
                siteInput.value = '';
                displaySites(sites);
            });
        } else {
            alert('Site already blocked!');
        }
    });
}

function removeSite(site) {
    browser.storage.local.get('blockedSites').then(result => {
        const sites = result.blockedSites || [];
        const updated = sites.filter(s => s !== site);
        
        browser.storage.local.set({ blockedSites: updated }).then(() => {
            displaySites(updated);
        });
    });
}

// Event listeners
addBtn.addEventListener('click', addSite);
siteInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addSite();
});
gameOverlayBtn.addEventListener('click', async () => {
    console.log("sending message to tab");

    const tabs = await browser.tabs.query({ active: true, currentWindow: true });

    browser.tabs.sendMessage(tabs[0].id, { action: "showOverlay" });
});

// Load sites on popup open
loadSites();