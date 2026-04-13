# PasteRack — Clipboard Manager (Electron.js)

## Overview

A lightweight, minimal macOS menu bar clipboard manager built with Electron.js. Lives in the system tray, monitors the clipboard, stores the last 100 copied text items in memory, and provides quick-paste via keyboard shortcuts. Includes a secure password vault for storing sensitive strings.

---

## Core Features

### 1. System Tray (Menu Bar) App
- Runs as a menu bar app (no dock icon, no main window by default)
- Clipboard icon sits in the macOS top navbar
- Clicking the tray icon opens a dropdown popup showing clipboard history
- App launches at startup (optional, configurable)

### 2. Clipboard Monitoring
- Polls the system clipboard at a short interval (~500ms)
- Detects new text copied to clipboard
- Stores up to **100 most recent** items in memory (in-process, no disk persistence)
- Deduplicates consecutive identical copies
- Supports **plain text** clipboard content only

### 3. Clipboard History UI (Popup Window)
- Opens when tray icon is clicked
- Minimal, clean design — simple rows, no cards
- Shows a scrollable list of copied items (newest first)
- Each item shows:
  - Truncated preview of the text (first ~80 chars)
  - Relative timestamp ("2s ago", "5m ago", "1h ago")
  - Position number (1-9) for shortcut-accessible items
- Click any item to copy it back to clipboard
- Search/filter bar at the top to find old clips
- "Clear All" button to wipe history

### 4. Keyboard Shortcuts (Global)
- **Cmd+Shift+V** — Open/toggle the PasteRack popup
- **Cmd+Shift+1** through **Cmd+Shift+9** — Instantly paste the 1st through 9th most recent clipboard item
- Shortcuts work globally (even when app is not focused)
- Unregister on app quit to avoid ghost shortcuts

### 5. In-Memory Storage
- All clipboard data stored in-process memory (JavaScript array)
- No database, no file persistence
- Data is lost on app quit (by design — privacy-friendly)
- Max 100 items, oldest items evicted when limit is reached (FIFO)

### 6. Secure Password Vault
- Separate "Passwords" tab/section in the popup
- Users can manually save labeled passwords (name + value)
- Passwords encrypted in memory using Electron's `safeStorage` API
- Passwords displayed as masked (`********`) by default
- Click eye icon to reveal, auto-hides after 5 seconds
- Click to copy password to clipboard (auto-clears from clipboard after 30s)
- Passwords are NOT captured from clipboard auto-monitoring (only manual save)
- Master password lock option to access the vault
- All passwords lost on app quit (in-memory only, same as clips)

---

## Technical Architecture

```
┌──────────────────────────────────────────────┐
│                Main Process                  │
│                                              │
│  ┌─────────────┐  ┌───────────────────────┐  │
│  │  Tray Icon   │  │  Clipboard Watcher   │  │
│  │  (Menu Bar)  │  │  (polling loop)      │  │
│  └──────┬──────┘  └──────────┬────────────┘  │
│         │                    │                │
│         │   ┌────────────────▼─────────────┐  │
│         │   │   ClipboardStore (mem)       │  │
│         │   │   - items[] (max 100)        │  │
│         │   │   - add / get / search /     │  │
│         │   │     clear                    │  │
│         │   └────────────────┬─────────────┘  │
│         │                    │                │
│         │   ┌────────────────▼─────────────┐  │
│         │   │   PasswordVault (mem)        │  │
│         │   │   - entries[] (encrypted)    │  │
│         │   │   - add / get / delete       │  │
│         │   │   - safeStorage encryption   │  │
│         │   └────────────────┬─────────────┘  │
│         │                    │                │
│  ┌──────▼────────────────────▼─────────────┐  │
│  │      Global Shortcut Manager            │  │
│  │   Cmd+Shift+1..9, Cmd+Shift+V          │  │
│  └─────────────────────────────────────────┘  │
│                                              │
│          IPC (ipcMain / ipcRenderer)         │
│                     │                        │
└─────────────────────┼────────────────────────┘
                      │
┌─────────────────────▼────────────────────────┐
│            Renderer Process                  │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │      Popup Window (HTML/CSS)           │  │
│  │                                        │  │
│  │  [History]  [Passwords]   <- tabs      │  │
│  │                                        │  │
│  │  History Tab:                          │  │
│  │  - Search bar                          │  │
│  │  - Clipboard item rows                │  │
│  │  - Click-to-copy                       │  │
│  │  - Clear all                           │  │
│  │                                        │  │
│  │  Passwords Tab:                        │  │
│  │  - Add new password form               │  │
│  │  - Masked password list                │  │
│  │  - Reveal / copy / delete actions      │  │
│  └────────────────────────────────────────┘  │
│                                              │
└──────────────────────────────────────────────┘
```

### Tech Stack
- **Electron.js** — Desktop shell
- **HTML/CSS/Vanilla JS** — Renderer UI (minimal, no framework)
- **Electron `clipboard`** — System clipboard access
- **Electron `globalShortcut`** — Global keyboard shortcuts
- **Electron `safeStorage`** — Encrypt password vault entries

### Key Electron APIs
| API | Purpose |
|-----|---------|
| `Tray` | Menu bar icon |
| `BrowserWindow` | Popup window (frameless, positioned near tray) |
| `clipboard` | Read/write system clipboard |
| `globalShortcut` | Register Cmd+Shift+1..9, Cmd+Shift+V |
| `nativeImage` | Tray icon |
| `safeStorage` | Encrypt/decrypt password vault entries |
| `ipcMain` / `ipcRenderer` | Main <-> Renderer communication |

---

## File Structure

```
clipboard-manager/
├── package.json
├── main.js                   # Main process entry point
├── src/
│   ├── clipboard-store.js    # In-memory clipboard storage (class)
│   ├── clipboard-watcher.js  # Polling loop to detect new copies
│   ├── password-vault.js     # Encrypted password storage (class)
│   ├── tray-manager.js       # System tray setup & management
│   ├── shortcut-manager.js   # Global keyboard shortcut registration
│   └── window-manager.js     # Popup window creation & positioning
├── renderer/
│   ├── index.html            # Popup UI
│   ├── styles.css            # Dark theme styling
│   ├── renderer.js           # Popup logic (tabs, list, search, IPC)
│   └── preload.js            # Secure bridge between main & renderer
├── assets/
│   ├── tray-icon.png         # 16x16 / 22x22 menu bar icon
│   └── tray-icon@2x.png     # Retina version
├── SCOPE.md
└── PROGRESS.md
```

---

## UI Design

### Dark Theme — Minimal Style

```
┌──────────────────────────────────────┐
│         P A S T E R A C K            │
├──────────────────────────────────────┤
│  [ History ]        [ Passwords ]    │
├──────────────────────────────────────┤
│  Search...                       🔍  │
├──────────────────────────────────────┤
│                                      │
│  1  Hello world copied text...  2s   │
│  ─────────────────────────────────── │
│  2  const x = function() {     5m   │
│  ─────────────────────────────────── │
│  3  https://github.com/ant...  12m   │
│  ─────────────────────────────────── │
│  4  SELECT * FROM users WH...   1h   │
│  ─────────────────────────────────── │
│  5  npm install electron        1h   │
│  ─────────────────────────────────── │
│  6  Lorem ipsum dolor sit...    2h   │
│  ─────────────────────────────────── │
│  7  { "key": "value" }          3h   │
│                                      │
├──────────────────────────────────────┤
│  [ Clear All ]           100 items   │
└──────────────────────────────────────┘

Passwords Tab:
┌──────────────────────────────────────┐
│         P A S T E R A C K            │
├──────────────────────────────────────┤
│  [ History ]        [ Passwords ]    │
├──────────────────────────────────────┤
│  + Add Password                      │
├──────────────────────────────────────┤
│                                      │
│  GitHub Token                        │
│  ********          👁  📋  🗑        │
│  ─────────────────────────────────── │
│  AWS Secret Key                      │
│  ********          👁  📋  🗑        │
│  ─────────────────────────────────── │
│  Database Password                   │
│  ********          👁  📋  🗑        │
│                                      │
├──────────────────────────────────────┤
│  3 passwords stored (encrypted)      │
└──────────────────────────────────────┘
```

### Design Principles
- **Background:** `#1a1a2e` (deep navy-black)
- **Surface:** `#16213e` (slightly lighter for rows)
- **Accent:** `#0f3460` (blue accent for active tab, hover)
- **Highlight:** `#e94560` (red-pink for actions, clear button)
- **Text:** `#eee` primary, `#888` secondary (timestamps)
- **Font:** System font (SF Pro on macOS), monospace for code snippets
- **Compact:** ~320px wide, ~450px tall
- **Rows:** Minimal separators, subtle hover highlight
- **No borders, no shadows** — flat, clean, minimal

---

## Password Vault Details

| Feature | Behavior |
|---------|----------|
| Add password | Form with "Label" and "Value" fields |
| Encryption | `safeStorage.encryptString()` — uses OS keychain |
| Display | Always masked, click eye to reveal for 5s |
| Copy | Click copy icon, auto-clears clipboard after 30s |
| Delete | Click trash icon, confirm before deleting |
| Auto-capture | Disabled — passwords are NEVER auto-captured from clipboard |
| Persistence | In-memory only, lost on app quit |

---

## Shortcut Summary

| Shortcut | Action |
|----------|--------|
| `Cmd+Shift+V` | Toggle PasteRack popup |
| `Cmd+Shift+1` | Paste 1st (most recent) clip |
| `Cmd+Shift+2` | Paste 2nd most recent clip |
| ... | ... |
| `Cmd+Shift+9` | Paste 9th most recent clip |

---

## Out of Scope (v1)

- Image/file clipboard support (text only)
- Disk persistence / database
- Pinned/favorite clips
- Clip categories or tags
- Sync across devices
- Windows/Linux support (macOS-first)
- Auto-launch on startup configuration UI
- Password sync or export

---

## Build Steps (High Level)

1. **Project setup** — `npm init`, install Electron, scaffold files
2. **Main process** — Tray icon, BrowserWindow (frameless popup)
3. **Clipboard watcher** — Polling loop, store class
4. **Password vault** — Encrypted storage with safeStorage API
5. **Renderer UI** — Dark themed popup with tabs (History / Passwords)
6. **IPC wiring** — Main <-> Renderer communication
7. **Global shortcuts** — Register Cmd+Shift+1..9, Cmd+Shift+V
8. **Paste mechanism** — Copy selected item to clipboard + simulate Cmd+V
9. **Polish** — Search, timestamps, animations, edge cases
10. **Package** — electron-builder for .dmg distribution
