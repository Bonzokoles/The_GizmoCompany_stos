/**
 * Code Signing & Notarization Script
 * macOS notarization, Windows code signing
 */

const { notarize } = require('@electron/notarize');
const fs = require('fs');
const path = require('path');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;

  if (electronPlatformName !== 'darwin') {
    return;
  }

  // Get credentials
  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_ID_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !appleIdPassword || !teamId) {
    console.warn('⚠️  Notarization credentials not found, skipping notarization');
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);

  if (!fs.existsSync(appPath)) {
    throw new Error(`Cannot find app to notarize: ${appPath}`);
  }

  console.log(`📝 Notarizing ${appPath}...`);

  try {
    await notarize({
      appBundleId: 'com.zeno-browser.app',
      appPath: appPath,
      appleId: appleId,
      appleIdPassword: appleIdPassword,
      teamId: teamId,
    });

    console.log('✅ Notarization successful!');
  } catch (error) {
    throw new Error(`Notarization failed: ${error}`);
  }
};