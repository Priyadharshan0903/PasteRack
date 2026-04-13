# PasteRack — Build Progress

## Status: BUILD COMPLETE — Ready to Test

---

## Phase 1: Project Setup
- [x] Initialize npm project (`package.json`)
- [x] Install Electron as dev dependency
- [x] Create main entry point (`main.js`)
- [x] Create file structure (`src/`, `renderer/`, `assets/`)
- [ ] Verify Electron launches on macOS

## Phase 2: System Tray (Menu Bar)
- [x] Create tray icon asset (16x16 template image)
- [x] Initialize `Tray` in main process
- [x] Hide dock icon (macOS menu bar app mode)
- [x] Create frameless `BrowserWindow` popup
- [x] Position popup below tray icon on click
- [x] Toggle popup on tray click

## Phase 3: Clipboard Monitoring & Storage
- [x] Build `ClipboardStore` class (in-memory, max 100 items)
- [x] Build `ClipboardWatcher` (polling loop, ~500ms interval)
- [x] Detect new clipboard text entries
- [x] Deduplicate consecutive identical copies
- [x] Auto-evict oldest items when at capacity

## Phase 4: Password Vault
- [x] Build `PasswordVault` class (encrypted in-memory storage)
- [x] Integrate Electron `safeStorage` API for encryption
- [x] Add password (label + encrypted value)
- [x] Retrieve & decrypt password
- [x] Delete password
- [x] Auto-clear copied password from clipboard after 30s

## Phase 5: Renderer UI (Popup) — Dark Theme
- [x] Create `index.html` with popup layout
- [x] Style with dark theme (`styles.css`) — navy-black palette
- [x] Build tab navigation (History / Passwords)
- [x] **History Tab:**
  - [x] Render clipboard items as minimal rows
  - [x] Show relative timestamps
  - [x] Show position numbers (1-9) for shortcut items
  - [x] Add search/filter bar
  - [x] Add "Clear All" button
  - [x] Add item count display
- [x] **Passwords Tab:**
  - [x] Add password form (label + value)
  - [x] Render masked password list
  - [x] Reveal button (eye icon, auto-hide after 5s)
  - [x] Copy button (with auto-clear after 30s)
  - [x] Delete button
  - [x] Password count display

## Phase 6: IPC Communication
- [x] Create `preload.js` with secure context bridge
- [x] Send clipboard items from main -> renderer
- [x] Handle item click (renderer -> main -> copy to clipboard)
- [x] Handle clear all (renderer -> main)
- [x] Handle search filtering
- [x] Handle password CRUD operations (add/get/delete)

## Phase 7: Global Shortcuts
- [x] Register `Cmd+Shift+V` to toggle popup
- [x] Register `Cmd+Shift+1` through `Cmd+Shift+9`
- [x] Implement paste mechanism (write to clipboard)
- [x] Unregister shortcuts on app quit
- [x] Handle shortcut registration failures gracefully

## Phase 8: Polish & Edge Cases
- [x] Handle empty state (no clips yet)
- [x] Handle empty state (no passwords yet)
- [x] Handle very long text (truncation via CSS)
- [x] Handle special characters (HTML escaping)
- [x] Click outside popup to dismiss (blur event)
- [x] Toast notifications for actions
- [ ] Test on macOS for edge cases

## Phase 9: Packaging
- [ ] Configure `electron-builder`
- [ ] Set app name to "PasteRack"
- [ ] Build `.dmg` for macOS distribution
- [ ] Test packaged app on macOS

---

## Notes

- **App Name:** PasteRack
- **Started:** 2026-04-13
- **Approach:** In-memory only, no persistence — privacy by design
- **Target:** macOS menu bar app
- **Theme:** Dark (navy-black: #1a1a2e, #16213e, #0f3460, accent #e94560)
- **Shortcuts:** `Cmd+Shift+1..9` (avoids conflicts with system shortcuts)
- **Password encryption:** Electron `safeStorage` API (OS keychain backed)
