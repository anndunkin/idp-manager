module.exports = {
  appId: "com.healthcareidp.manager",
  productName: "IDP Manager",
  directories: { output: "dist-installer" },
  files: ["dist/**/*", "electron/dist/**/*", "node_modules/**/*"],
  asar: true,
  win: {
    target: [{ target: "nsis", arch: ["x64"] }],
    icon: "assets/icon.ico",
    signingHashAlgorithms: ["sha256"],
    sign: null
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: "IDP Manager"
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
