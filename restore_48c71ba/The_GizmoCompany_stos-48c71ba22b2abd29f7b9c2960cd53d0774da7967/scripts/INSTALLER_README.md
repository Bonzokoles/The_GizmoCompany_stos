# ZENO Browser - Installer Documentation

## Windows Installer (NSIS)

### Requirements
- Node.js 18+
- NSIS (installed via chocolatey or direct download)
- Code signing certificate (optional but recommended)

### Build
```bash
npm run build:nsis
```

### Output
- `dist/ZENO Browser Setup x.x.x.exe` - Full installer
- `dist/ZENO Browser x.x.x.exe` - Portable version
- `dist/ZENO Browser x.x.x.msi` - MSI installer

### Features
- Custom installer dialogs
- Desktop shortcuts
- Start menu shortcuts
- Registry entries for file associations
- Uninstaller
- Auto-update notifications

### Code Signing
```bash
export WIN_CERT_FILE=/path/to/cert.pfx
export WIN_CERT_PASSWORD=password
npm run build:nsis
```

---

## macOS Installer (DMG)

### Requirements
- macOS with Xcode
- Apple Developer account
- Code signing certificate
- Notarization credentials

### Build
```bash
npm run build:dmg
```

### Output
- `dist/ZENO Browser-x.x.x.dmg` - DMG installer
- `dist/ZENO Browser-x.x.x.zip` - ZIP archive
- `dist/ZENO Browser-x.x.x.pkg` - PKG installer

### Code Signing & Notarization
```bash
export APPLE_ID=your-email@apple.com
export APPLE_ID_PASSWORD=app-specific-password
export APPLE_TEAM_ID=XXXXXXXXXX
npm run build:dmg
```

### Features
- Drag-and-drop installation
- Code signed
- Notarized for Gatekeeper
- DMG with custom background
- Auto-update support

---

## Linux Installers

### Requirements
- Linux environment
- appimagetool installed

### Build
```bash
npm run build:appimage
npm run build:deb
npm run build:rpm
```

### Output
- `dist/ZENO Browser-x.x.x.AppImage` - Portable AppImage
- `dist/zeno-browser-x.x.x.deb` - Debian package
- `dist/zeno-browser-x.x.x.rpm` - RPM package

### Features
- Standalone AppImage
- System integration (mime types, desktop shortcuts)
- Auto-update support
- Package manager support

---

## Environment Variables

### Code Signing (Windows)
```bash
WIN_CERT_FILE=/path/to/certificate.pfx
WIN_CERT_PASSWORD=password
```

### Code Signing (macOS)
```bash
APPLE_ID=your-email@apple.com
APPLE_ID_PASSWORD=app-specific-password
APPLE_TEAM_ID=XXXXXXXXXX
MAC_CERT_FILE=/path/to/certificate.p12
MAC_CERT_PASSWORD=password
MAC_SIGNING_IDENTITY="Developer ID Application"
```

### GitHub Release
```bash
GITHUB_TOKEN=your_token
```

---

## Testing Installers

### Windows
```bash
./dist/ZENO\ Browser\ Setup\ x.x.x.exe
```

### macOS
```bash
# Mount DMG
open dist/ZENO\ Browser-x.x.x.dmg

# Or direct install
sudo installer -pkg dist/ZENO\ Browser-x.x.x.pkg -target /
```

### Linux
```bash
# AppImage
./dist/ZENO\ Browser-x.x.x.AppImage

# Debian
sudo dpkg -i dist/zeno-browser-x.x.x.deb

# RPM
sudo rpm -i dist/zeno-browser-x.x.x.rpm
```

---

## Custom Branding

Edit `electron-builder.config.js`:
- `appId` - Unique identifier
- `productName` - Display name
- Icons - Custom installer icons
- DMG background - Custom DMG design

---

## Troubleshooting

### NSIS not found
```bash
# Windows
choco install nsis

# macOS
brew install nsis
```

### Code signing fails
- Verify certificate paths
- Check password
- Ensure valid certificate format

### Notarization fails
- Check Apple ID credentials
- Verify app is properly signed
- Check internet connection

### DMG mounting fails
- Try recreating DMG background
- Verify background image format
- Check DMG size

---

For more information, see [Building Installers Guide](../docs/INSTALLER_GUIDE.md)