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
    "!node_modules/.bin"
  ],
  extraResources: [
    { from: 'scripts/generateFormTemplate.js', to: 'scripts/generateFormTemplate.js' }
  ],
  asar: true,
  asarUnpack: [
    "node_modules/better-sqlite3/build/Release/*.node",
    "electron/dist/preload.js"
  ],
  // Rebuild better-sqlite3 against the target Electron ABI while packaging.
  npmRebuild: true,
  win: {
    target: [
      { target: "zip", arch: ["x64"] },
      { target: "nsis", arch: ["x64"] }
    ],
    icon: "assets/icon.ico",
    requestedExecutionLevel: "asInvoker",
    forceCodeSigning: false,
    signAndEditExecutable: false
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    perMachine: false,
    allowElevation: false,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: "IDP Manager",
    deleteAppDataOnUninstall: false,
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
