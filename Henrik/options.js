const STORAGE_KEY = "blockedDomains";

function sanitizeDomain(s) {
  if (!s) return "";
  s = s.trim().toLowerCase();
  s = s.replace(/^https?:\/\//, "");
  s = s.split("/")[0];
  s = s.split(":")[0];
  return s;
}

const domainInput = document.getElementById("domainInput");
const addBtn = document.getElementById("addBtn");
const domainsDiv = document.getElementById("domains");

async function loadList() {
  const data = await browser.storage.local.get(STORAGE_KEY);
  return data[STORAGE_KEY] || [];
}

async function saveList(list) {
  await browser.storage.local.set({ [STORAGE_KEY]: list });
}

function renderList(list) {
  domainsDiv.innerHTML = "";
  if (list.length === 0) {
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
    rm.onclick = async () => {
      list.splice(idx, 1);
      await saveList(list);
      renderList(list);
    };

    row.appendChild(span);
    row.appendChild(rm);
    domainsDiv.appendChild(row);
  });
}

addBtn.onclick = async () => {
  const d = sanitizeDomain(domainInput.value);
  if (!d) {
    alert("Enter a valid domain");
    return;
  }

  const list = await loadList();
  if (list.includes(d)) {
    alert("Already blocked");
    return;
  }

  list.push(d);
  await saveList(list);
  renderList(list);
  domainInput.value = "";
};

(async () => {
  const list = await loadList();
  renderList(list);
})();
