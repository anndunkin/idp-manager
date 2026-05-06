// Mock electron module for test environment
export const app = {
  getPath: (name: string) => {
    if (name === 'userData') return '/tmp/test-idp-manager';
    return '/tmp';
  },
  isPackaged: false,
};

export const ipcMain = {
  handle: () => {},
  on: () => {},
};

export const ipcRenderer = {
  invoke: async () => {},
  on: () => {},
  send: () => {},
};

export const contextBridge = {
  exposeInMainWorld: () => {},
};

export const BrowserWindow = class {
  static getAllWindows() { return []; }
  static fromWebContents() { return null; }
  loadURL() {}
  loadFile() {}
  show() {}
  once() {}
  on() {}
  webContents = {
    openDevTools: () => {},
    session: {
      webRequest: {
        onHeadersReceived: () => {},
      },
    },
    on: () => {},
  };
};

export const dialog = {
  showSaveDialog: async () => ({ canceled: true, filePath: undefined }),
};

export const shell = {
  openExternal: () => {},
  openPath: () => {},
};
