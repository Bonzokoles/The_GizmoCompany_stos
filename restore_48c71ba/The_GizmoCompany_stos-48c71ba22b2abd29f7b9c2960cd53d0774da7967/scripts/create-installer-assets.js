/**
 * Create Installer Assets
 * Generuje potrzebne pliki dla instalatorów
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const assetsDir = 'assets/installer';

// Ensure directory exists
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

console.log('📦 Creating installer assets...');

// Create icon from main icon
async function createIcons() {
  try {
    const icon = 'assets/icon.png';

    // Windows icon (.ico)
    await sharp(icon)
      .resize(256, 256)
      .toFile(path.join(assetsDir, 'icon.ico'));
    console.log('✅ Windows icon created');

    // macOS icon (.icns) - simplified
    await sharp(icon)
      .resize(512, 512)
      .toFile(path.join(assetsDir, 'icon-macos.png'));
    console.log('✅ macOS icon created');

    // Linux icon
    await sharp(icon)
      .resize(256, 256)
      .toFile(path.join(assetsDir, 'icon-linux.png'));
    console.log('✅ Linux icon created');
  } catch (error) {
    console.error('Error creating icons:', error);
  }
}

// Create DMG background
async function createDmgBackground() {
  try {
    const width = 540;
    const height = 380;

    // Create gradient background
    const svg = `
      <svg width="${width}" height="${height}">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#16213e;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="${width}" height="${height}" fill="url(#grad)"/>
        <text x="50%" y="50%" font-size="48" fill="white" text-anchor="middle" 
              font-family="Arial" font-weight="bold">ZENO Browser</text>
      </svg>
    `;

    fs.writeFileSync(path.join(assetsDir, 'dmg-background.svg'), svg);

    // Convert to PNG
    await sharp(Buffer.from(svg))
      .png()
      .toFile(path.join(assetsDir, 'dmg-background.png'));

    console.log('✅ DMG background created');
  } catch (error) {
    console.error('Error creating DMG background:', error);
  }
}

// Run
async function main() {
  await createIcons();
  await createDmgBackground();
  console.log('✅ All installer assets created!');
}

main().catch(console.error);