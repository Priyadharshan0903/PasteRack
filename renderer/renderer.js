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
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ── Toast ──
let toastTimer = null;
function showToast(message, type = "success") {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.className = `toast ${type}`;
  toast.textContent = message;

  // Force reflow for re-trigger animation
  void toast.offsetWidth;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
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

      const shortcutLabel = index < 9
        ? `<span class="clip-index">${index + 1}</span>`
        : `<span class="clip-index no-shortcut">${index + 1}</span>`;

      el.innerHTML = `
        ${shortcutLabel}
        <div class="clip-body">
          <div class="clip-text">${escapeHtml(item.text)}</div>
        </div>
        <span class="clip-time">${timeAgo(item.timestamp)}</span>
      `;
      el.addEventListener("click", async () => {
        await window.pasterack.copyClip(item.id);
        showToast("Copied to clipboard");
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
  showToast("History cleared");
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

      const initial = pw.label.charAt(0).toUpperCase();

      el.innerHTML = `
        <div class="pw-icon">${escapeHtml(initial)}</div>
        <div class="pw-info">
          <div class="pw-label">${escapeHtml(pw.label)}</div>
          <div class="pw-masked" data-id="${pw.id}">\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022</div>
        </div>
        <div class="pw-actions">
          <button class="pw-btn reveal" title="Reveal">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
          <button class="pw-btn copy" title="Copy">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <rect x="9" y="9" width="13" height="13" rx="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </button>
          <button class="pw-btn delete" title="Delete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/>
            </svg>
          </button>
        </div>
      `;

      // Reveal
      el.querySelector(".reveal").addEventListener("click", async () => {
        const masked = el.querySelector(".pw-masked");
        const value = await window.pasterack.revealPassword(pw.id);
        if (value) {
          masked.textContent = value;
          masked.style.color = "var(--accent-light)";
          masked.style.letterSpacing = "0";
          setTimeout(() => {
            masked.textContent = "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";
            masked.style.color = "";
            masked.style.letterSpacing = "";
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
        showToast("Password deleted");
      });

      passwordsList.appendChild(el);
    });
  }

  passwordsCount.textContent = `${passwords.length} password${passwords.length !== 1 ? "s" : ""} \u2022 encrypted`;
}

// Add password
btnAddPw.addEventListener("click", async () => {
  const label = pwLabel.value.trim();
  const value = pwValue.value;

  if (!label || !value) {
    showToast("Fill in both fields", "error");
    return;
  }

  const result = await window.pasterack.addPassword(label, value);
  if (result) {
    pwLabel.value = "";
    pwValue.value = "";
    loadPasswords();
    showToast("Saved to vault");
  } else {
    showToast("Label already exists", "error");
  }
});

// Enter key in password form
pwValue.addEventListener("keydown", (e) => {
  if (e.key === "Enter") btnAddPw.click();
});

// Escape key closes window
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    window.close();
  }
});

// ── Init ──
(async () => {
  const items = await window.pasterack.getClips();
  renderClips(items);
})();
