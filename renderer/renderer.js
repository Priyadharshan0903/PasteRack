// ── State ──
let currentTab = "history";
let clips = [];

// ── DOM refs ──
const tabBtns = document.querySelectorAll(".tab");
const tabContents = document.querySelectorAll(".tab-content");
const searchInput = document.getElementById("search-input");
const clipsList = document.getElementById("clips-list");
const clipsEmpty = document.getElementById("clips-empty");
const clipsCount = document.getElementById("clips-count");
const btnClearClips = document.getElementById("btn-clear-clips");
const passwordsList = document.getElementById("passwords-list");
const passwordsEmpty = document.getElementById("passwords-empty");
const passwordsCount = document.getElementById("passwords-count");
const pwLabel = document.getElementById("pw-label");
const pwValue = document.getElementById("pw-value");
const btnAddPw = document.getElementById("btn-add-pw");

// ── Tabs ──
tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;
    currentTab = tab;

    tabBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    tabContents.forEach((c) => c.classList.remove("active"));
    document.getElementById(`tab-${tab}`).classList.add("active");

    if (tab === "passwords") loadPasswords();
  });
});

// ── Time formatting ──
function timeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 5) return "now";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

// ── Toast ──
let toastTimer = null;
function showToast(message) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 1500);
}

// ── Clipboard History ──
function renderClips(items) {
  clips = items;
  const existing = clipsList.querySelectorAll(".clip-item");
  existing.forEach((el) => el.remove());

  if (items.length === 0) {
    clipsEmpty.style.display = "flex";
  } else {
    clipsEmpty.style.display = "none";
    items.forEach((item, index) => {
      const el = document.createElement("div");
      el.className = "clip-item";
      el.innerHTML = `
        <span class="clip-index ${index >= 9 ? "no-shortcut" : ""}">${index + 1}</span>
        <div class="clip-body">
          <div class="clip-text">${escapeHtml(item.text)}</div>
        </div>
        <span class="clip-time">${timeAgo(item.timestamp)}</span>
      `;
      el.addEventListener("click", async () => {
        await window.pasterack.copyClip(item.id);
        showToast("Copied!");
      });
      clipsList.appendChild(el);
    });
  }

  clipsCount.textContent = `${items.length} item${items.length !== 1 ? "s" : ""}`;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Search
let searchDebounce = null;
searchInput.addEventListener("input", () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(async () => {
    const query = searchInput.value.trim();
    if (query) {
      const results = await window.pasterack.searchClips(query);
      renderClips(results);
    } else {
      const all = await window.pasterack.getClips();
      renderClips(all);
    }
  }, 150);
});

// Clear all
btnClearClips.addEventListener("click", async () => {
  await window.pasterack.clearClips();
  renderClips([]);
  showToast("Cleared");
});

// Listen for updates from main process
window.pasterack.onClipsUpdated((items) => {
  if (!searchInput.value.trim()) {
    renderClips(items);
  }
});

// ── Password Vault ──
async function loadPasswords() {
  const passwords = await window.pasterack.getPasswords();
  renderPasswords(passwords);
}

function renderPasswords(passwords) {
  const existing = passwordsList.querySelectorAll(".pw-item");
  existing.forEach((el) => el.remove());

  if (passwords.length === 0) {
    passwordsEmpty.style.display = "flex";
  } else {
    passwordsEmpty.style.display = "none";
    passwords.forEach((pw) => {
      const el = document.createElement("div");
      el.className = "pw-item";
      el.innerHTML = `
        <div class="pw-info">
          <div class="pw-label">${escapeHtml(pw.label)}</div>
          <div class="pw-masked" data-id="${pw.id}">••••••••</div>
        </div>
        <div class="pw-actions">
          <button class="pw-btn reveal" title="Reveal" data-id="${pw.id}">&#x1f441;</button>
          <button class="pw-btn copy" title="Copy" data-id="${pw.id}">&#x2398;</button>
          <button class="pw-btn delete" title="Delete" data-id="${pw.id}">&#x2715;</button>
        </div>
      `;

      // Reveal
      el.querySelector(".reveal").addEventListener("click", async () => {
        const masked = el.querySelector(".pw-masked");
        const value = await window.pasterack.revealPassword(pw.id);
        if (value) {
          masked.textContent = value;
          setTimeout(() => {
            masked.textContent = "••••••••";
          }, 5000);
        }
      });

      // Copy
      el.querySelector(".copy").addEventListener("click", async () => {
        await window.pasterack.copyPassword(pw.id);
        showToast("Copied! Auto-clears in 30s");
      });

      // Delete
      el.querySelector(".delete").addEventListener("click", async () => {
        await window.pasterack.deletePassword(pw.id);
        loadPasswords();
        showToast("Deleted");
      });

      passwordsList.appendChild(el);
    });
  }

  passwordsCount.textContent = `${passwords.length} password${passwords.length !== 1 ? "s" : ""}`;
}

// Add password
btnAddPw.addEventListener("click", async () => {
  const label = pwLabel.value.trim();
  const value = pwValue.value;

  if (!label || !value) {
    showToast("Fill in both fields");
    return;
  }

  const result = await window.pasterack.addPassword(label, value);
  if (result) {
    pwLabel.value = "";
    pwValue.value = "";
    loadPasswords();
    showToast("Password saved");
  } else {
    showToast("Label already exists");
  }
});

// Enter key in password form
pwValue.addEventListener("keydown", (e) => {
  if (e.key === "Enter") btnAddPw.click();
});

// ── Init ──
(async () => {
  const items = await window.pasterack.getClips();
  renderClips(items);
})();
