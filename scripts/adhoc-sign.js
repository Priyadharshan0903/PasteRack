// Ad-hoc signs the .app bundle after electron-builder packs it.
// This prevents the "app is damaged" error on macOS.
// Users still need to right-click > Open once (standard for unsigned apps).

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

async function afterPack(context) {
  // When called as afterPack hook by electron-builder
  if (context && context.appOutDir) {
    const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
    signApp(appPath);
    return;
  }
}

function signApp(appPath) {
  if (!fs.existsSync(appPath)) return;

  console.log(`\n  Ad-hoc signing: ${appPath}\n`);
  try {
    execSync(
      `codesign --force --deep --sign - "${appPath}"`,
      { stdio: "inherit" }
    );
    console.log("  Ad-hoc signing complete.\n");
  } catch (e) {
    console.warn("  Ad-hoc signing skipped (not on macOS or codesign unavailable)\n");
  }
}

// When called directly via `node scripts/adhoc-sign.js`
if (require.main === module) {
  const distMac = path.join(__dirname, "..", "dist", "mac-universal");
  const distMacArm = path.join(__dirname, "..", "dist", "mac-arm64");
  const distMacX64 = path.join(__dirname, "..", "dist", "mac");

  for (const dir of [distMac, distMacArm, distMacX64]) {
    const appPath = path.join(dir, "PasteRack.app");
    if (fs.existsSync(appPath)) {
      signApp(appPath);
    }
  }
}

module.exports = afterPack;
