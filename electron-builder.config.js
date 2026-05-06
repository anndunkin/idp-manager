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
  // Unpack native .node files AND the preload script from asar
  // (sandbox:false means preload can run from inside asar, but unpacking is safer)
  asarUnpack: [
    "node_modules/better-sqlite3/build/Release/*.node",
    "electron/dist/preload.js"
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
    // Install to the same directory the installer EXE is run from
    // $INSTDIR is set to installer location via customization below
    installerSidebar: null,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: "IDP Manager",
    deleteAppDataOnUninstall: false,
    // Custom NSIS script to install to the folder containing the installer
    include: "scripts/installer.nsh"
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
