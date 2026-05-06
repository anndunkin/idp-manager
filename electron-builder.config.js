module.exports = {
  appId: "com.healthcareidp.manager",
  productName: "IDP Manager",
  directories: { output: "dist-installer" },
  files: ["dist/**/*", "electron/dist/**/*", "node_modules/**/*"],
  asar: true,
  win: {
    target: [{ target: "nsis", arch: ["x64"] }],
    icon: "assets/icon.ico",
    requestedExecutionLevel: "asInvoker",
    forceCodeSigning: false,
    signAndEditExecutable: false,
    signtoolOptions: {
      signingHashAlgorithms: ["sha256"]
    }
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
