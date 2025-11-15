// options.js
const STORAGE_KEY = "blockedDomains";
const domainInput = document.getElementById("domainInput");
const addBtn = document.getElementById("addBtn");
const domainsDiv = document.getElementById("domains");

function sanitizeDomain(s) {
  if (!s) return "";
  s = s.trim().toLowerCase();
  // remove protocol if user pasted it
  s = s.replace(/^https?:\/\//, "");
  // remove trailing slashes and paths
  s = s.split("/")[0];
  // remove port if present
  s = s.split(":")[0];
  return s;
}

function renderList(list) {
  domainsDiv.innerHTML = "";
  if (!list.length) {
    domainsDiv.textContent = "No blocked domains yet.";
    return;
  }
  list.forEach((d, idx) => {
    const row = document.createElement("div");
    row.className = "domain";
    const span = document.createElement("span");
    span.textContent = d;
    const rm = document.createElement("button");
    rm.textContent = "Remove";
    rm.addEventListener("click", async () => {
      list.splice(idx, 1);
      await saveList(list);
      renderList(list);
      // notify background to reapply rules
      browser.runtime.sendMessage({ type: "apply-domains", domains: list });
    });
    row.appendChild(span);
    row.appendChild(rm);
    domainsDiv.appendChild(row);
  });
}

async function loadList() {
  const data = await browser.storage.local.get(STORAGE_KEY);
  return data[STORAGE_KEY] || [];
}

async function saveList(list) {
  await browser.storage.local.set({ [STORAGE_KEY]: list });
}

addBtn.addEventListener("click", async () => {
  const raw = domainInput.value;
  const d = sanitizeDomain(raw);
  if (!d) {
    alert("Please enter a valid domain like example.com");
    return;
  }
  const list = await loadList();
  if (list.includes(d)) {
    alert("Domain already in block list.");
    domainInput.value = "";
    return;
  }
  list.push(d);
  await saveList(list);
  renderList(list);
  domainInput.value = "";
  // notify background to reapply rules
  browser.runtime.sendMessage({ type: "apply-domains", domains: list });
});

(async function() {
  const list = await loadList();
  renderList(list);
})();
