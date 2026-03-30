/**
 * Electron Builder Configuration
 * Multi-platform installer configuration
 */

module.exports = {
  appId: 'com.zeno-browser.app',
  productName: 'THE_Zenon_browser',
  directories: {
    output: 'dist',
    buildResources: 'assets/installer',
  },

  files: [
    {
      from: 'dist',
      to: 'app/dist',
      filter: ['**/*', '!**/*.map'],
    },
    {
      from: 'dist-electron',
      to: 'app/dist-electron',
      filter: ['**/*', '!**/*.map'],
    },
    {
      from: 'node_modules',
      to: 'app/node_modules',
      filter: ['**/package.json', '**/LICENSE', '**/*.node'],
    },
  ],

  // ========================================
  // Windows (NSIS)
  // ========================================
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'THE_Zenon_browser',
    installerIcon: 'assets/installer/icon.ico',
    uninstallerIcon: 'assets/installer/icon.ico',
    installerHeaderIcon: 'assets/installer/icon.ico',
    installerSidebar: 'assets/installer/sidebar.bmp',
    installerWizardImg: 'assets/installer/wizard.bmp',
    license: 'LICENSE',
  },

  win: {
    certificateFile: process.env.WIN_CERT_FILE,
    certificatePassword: process.env.WIN_CERT_PASSWORD,
    signingHashAlgorithms: ['sha256'],
    sign: './customSign.js',
    target: [
      {
        target: 'nsis',
        arch: ['x64', 'ia32', 'arm64'],
      },
      {
        target: 'portable',
        arch: ['x64'],
      },
      {
        target: 'msi',
        arch: ['x64'],
      },
    ],
  },

  // ========================================
  // macOS (DMG)
  // ========================================
  dmg: {
    contents: [
      {
        x: 110,
        y: 150,
        type: 'file',
      },
      {
        x: 240,
        y: 150,
        type: 'link',
        path: '/Applications',
      },
    ],
    window: {
      width: 540,
      height: 380,
    },
    iconSize: 120,
    iconTextSize: 12,
    background: 'assets/installer/dmg-background.png',
  },

  mac: {
    certificateFile: process.env.MAC_CERT_FILE,
    certificatePassword: process.env.MAC_CERT_PASSWORD,
    signingIdentity: process.env.MAC_SIGNING_IDENTITY,
    notarize: {
      teamId: process.env.APPLE_TEAM_ID,
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_ID_PASSWORD,
    },
    target: [
      {
        target: 'dmg',
        arch: ['x64', 'arm64'],
      },
      {
        target: 'zip',
        arch: ['x64', 'arm64'],
      },
      {
        target: 'pkg',
        arch: ['x64', 'arm64'],
      },
    ],
  },

  // ========================================
  // Linux (AppImage)
  // ========================================
  appImage: {
    artifactName: '${productName}-${version}.${ext}',
  },

  linux: {
    target: [
      {
        target: 'AppImage',
        arch: ['x64', 'arm64'],
      },
      {
        target: 'snap',
        arch: ['x64'],
      },
      {
        target: 'deb',
        arch: ['x64', 'arm64'],
      },
      {
        target: 'rpm',
        arch: ['x64'],
      },
    ],
    category: 'Utility',
    icon: 'assets/installer/icon.png',
  },

  // ========================================
  // Snap (Linux snap store)
  // ========================================
  snap: {
    publish: {
      provider: 'snapStore',
      channels: ['stable', 'candidate', 'beta', 'edge'],
    },
  },

  // ========================================
  // Auto-update configuration
  // ========================================
  publish: {
    provider: 'github',
    owner: 'Bonzokoles',
    repo: 'zen-bro-wser.org',
    releaseType: 'release',
  },

  // ========================================
  // Code signing
  // ========================================
  certificateChain: 'certs/certificate-chain.crt',
};