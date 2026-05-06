module.exports = {
  appId: "com.healthcareidp.manager",
  productName: "IDP Manager",
  directories: { output: "dist-installer" },
  files: [
    "dist/**/*",
    "electron/dist/**/*",
    "node_modules/**/*",
    "!node_modules/*/{CHANGELOG.md,README.md,readme.md}",
    "!node_modules/*/{test,__tests__,tests,example,examples}",
    "!node_modules/.bin",
    "prebuilt-win32-x64/**/*"
  ],
  asar: true,
  // Unpack native .node binaries so afterPack can inject the Win32 prebuilt
  asarUnpack: [
    "node_modules/better-sqlite3/build/Release/*.node"
  ],
  // Skip npm/electron rebuild — prebuilt Win32 binary injected via afterPack
  npmRebuild: false,
  afterPack: "./scripts/afterPack.js",
  win: {
    target: [{ target: "nsis", arch: ["x64"] }],
    icon: "assets/icon.ico",
    requestedExecutionLevel: "asInvoker",
    forceCodeSigning: false,
    signAndEditExecutable: false
  },
  nsis: {
    oneClick: true,
    perMachine: false,
    allowElevation: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: "IDP Manager",
    deleteAppDataOnUninstall: false
  },
  mac: {
    target: "dmg",
    icon: "assets/icon.icns"
  },
  linux: {
    target: "AppImage",
    icon: "assets/icon.png"
  }
}
