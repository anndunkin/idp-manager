import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import {
  getDatabase,
  employeeGetAll, employeeGetById, employeeCreate, employeeUpdate, employeeDelete,
  planGetByEmployee, planGetById, planCreate, planUpdate, planDelete,
  itemGetByPlan, itemCreate, itemUpdate, itemDelete, itemReorder,
  milestoneGetByItem, milestoneUpsert,
} from './database';
import type {
  EmployeeCreate, EmployeeUpdate,
  PlanCreate, PlanUpdate,
  ItemCreate, ItemUpdate,
  MilestoneUpsert,
} from './types';

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// In production the compiled main.js is at:
//   <asar>/electron/dist/main.js   (package.json main field)
// The renderer index.html is at:
//   <asar>/dist/index.html
// __dirname inside the asar = /electron/dist  → ../../dist/index.html = /dist/index.html ✓
// But we use app.getAppPath() to be explicit and asar-safe.
const RENDERER_PATH = isDev
  ? 'http://localhost:5173'
  : path.join(app.getAppPath(), 'dist', 'index.html');

// Preload must be an absolute filesystem path (not inside asar when sandbox:true).
// electron/dist/preload.js is extracted to app.asar.unpacked by the asarUnpack rule,
// OR we reference it via __dirname which Electron resolves correctly for preloads.
const PRELOAD_PATH = path.join(__dirname, 'preload.js');

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: PRELOAD_PATH,
      nodeIntegration: false,
      contextIsolation: true,
      // sandbox: true requires preload to be outside asar — disabled for compatibility
      // contextIsolation: true already provides the security boundary
      sandbox: false,
      webSecurity: true,
    },
    // hiddenInset is macOS only — use default on Windows/Linux
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#f8fafc',
    show: false,
  });

  win.once('ready-to-show', () => win.show());

  if (isDev) {
    win.loadURL(RENDERER_PATH);
    win.webContents.openDevTools();
  } else {
    win.loadFile(RENDERER_PATH)
      .catch(err => {
        // Log to a file so we can diagnose launch failures
        const logPath = path.join(app.getPath('userData'), 'launch-error.log');
        fs.appendFileSync(logPath, `[${new Date().toISOString()}] loadFile error: ${err}\npath: ${RENDERER_PATH}\n`);
      });
  }

  // Content Security Policy
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
          "script-src 'self' 'unsafe-inline'; " +
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
          "font-src 'self' https://fonts.gstatic.com data:; " +
          "img-src 'self' data:; " +
          "connect-src 'self'",
        ],
      },
    });
  });

  // Block navigation to external URLs
  win.webContents.on('will-navigate', (event, url) => {
    try {
      const parsedUrl = new URL(url);
      if (isDev && parsedUrl.origin === 'http://localhost:5173') return;
      if (parsedUrl.protocol === 'file:') return;
    } catch { /* ignore */ }
    event.preventDefault();
    shell.openExternal(url);
  });

  // Log any renderer crashes to userData for diagnostics
  win.webContents.on('render-process-gone', (_e, details) => {
    const logPath = path.join(app.getPath('userData'), 'launch-error.log');
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] render-process-gone: ${JSON.stringify(details)}\n`);
  });

  win.webContents.on('did-fail-load', (_e, errorCode, errorDescription, validatedURL) => {
    const logPath = path.join(app.getPath('userData'), 'launch-error.log');
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] did-fail-load: ${errorCode} ${errorDescription} url=${validatedURL}\n`);
  });
}

app.whenReady().then(() => {
  // Initialize DB
  getDatabase();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}).catch(err => {
  const logPath = path.join(app.getPath('userData'), 'launch-error.log');
  try { fs.appendFileSync(logPath, `[${new Date().toISOString()}] app.whenReady error: ${err}\n`); } catch { /* ignore */ }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

// Employees
ipcMain.handle('employees:getAll', () => {
  const db = getDatabase();
  return employeeGetAll(db);
});

ipcMain.handle('employees:getById', (_e, id: number) => {
  return employeeGetById(getDatabase(), id);
});

ipcMain.handle('employees:create', (_e, data: EmployeeCreate) => {
  return employeeCreate(getDatabase(), data);
});

ipcMain.handle('employees:update', (_e, id: number, data: EmployeeUpdate) => {
  return employeeUpdate(getDatabase(), id, data);
});

ipcMain.handle('employees:delete', (_e, id: number) => {
  return employeeDelete(getDatabase(), id);
});

// Plans
ipcMain.handle('plans:getByEmployee', (_e, employeeId: number) => {
  return planGetByEmployee(getDatabase(), employeeId);
});

ipcMain.handle('plans:getById', (_e, id: number) => {
  return planGetById(getDatabase(), id);
});

ipcMain.handle('plans:create', (_e, data: PlanCreate) => {
  return planCreate(getDatabase(), data);
});

ipcMain.handle('plans:update', (_e, id: number, data: PlanUpdate) => {
  return planUpdate(getDatabase(), id, data);
});

ipcMain.handle('plans:delete', (_e, id: number) => {
  return planDelete(getDatabase(), id);
});

// Items
ipcMain.handle('items:getByPlan', (_e, planId: number) => {
  return itemGetByPlan(getDatabase(), planId);
});

ipcMain.handle('items:create', (_e, data: ItemCreate) => {
  return itemCreate(getDatabase(), data);
});

ipcMain.handle('items:update', (_e, id: number, data: ItemUpdate) => {
  return itemUpdate(getDatabase(), id, data);
});

ipcMain.handle('items:delete', (_e, id: number) => {
  return itemDelete(getDatabase(), id);
});

ipcMain.handle('items:reorder', (_e, planId: number, itemIds: number[]) => {
  return itemReorder(getDatabase(), planId, itemIds);
});

// Milestones
ipcMain.handle('milestones:getByItem', (_e, itemId: number) => {
  return milestoneGetByItem(getDatabase(), itemId);
});

ipcMain.handle('milestones:upsert', (_e, data: MilestoneUpsert) => {
  return milestoneUpsert(getDatabase(), data);
});

// ─── Export Handlers ──────────────────────────────────────────────────────────

async function saveExportFile(
  win: BrowserWindow,
  defaultName: string,
  ext: string,
  buffer: Buffer
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    defaultPath: defaultName,
    filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
  });
  if (canceled || !filePath) return { success: false };

  fs.writeFileSync(filePath, buffer);
  shell.openPath(filePath);
  return { success: true, filePath };
}

ipcMain.handle('export:toExcel', async (event, planId: number) => {
  try {
    const win = BrowserWindow.fromWebContents(event.sender)!;
    const planData = planGetById(getDatabase(), planId);
    if (!planData) throw new Error('Plan not found');
    const { exportToExcelBuffer } = await import('./exportMain');
    const buffer = await exportToExcelBuffer(planData);
    const employee = planData.employee;
    const name = `IDP_${employee?.name ?? 'Plan'}_${planData.plan_year}`.replace(/\s+/g, '_');
    return saveExportFile(win, `${name}.xlsx`, 'xlsx', buffer);
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('export:toWord', async (event, planId: number) => {
  try {
    const win = BrowserWindow.fromWebContents(event.sender)!;
    const planData = planGetById(getDatabase(), planId);
    if (!planData) throw new Error('Plan not found');
    const { exportToWordBuffer } = await import('./exportMain');
    const buffer = await exportToWordBuffer(planData);
    const employee = planData.employee;
    const name = `IDP_${employee?.name ?? 'Plan'}_${planData.plan_year}`.replace(/\s+/g, '_');
    return saveExportFile(win, `${name}.docx`, 'docx', buffer);
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('export:toPdf', async (event, planId: number) => {
  try {
    const win = BrowserWindow.fromWebContents(event.sender)!;
    const planData = planGetById(getDatabase(), planId);
    if (!planData) throw new Error('Plan not found');
    const { exportToPdfBuffer } = await import('./exportMain');
    const buffer = await exportToPdfBuffer(planData);
    const employee = planData.employee;
    const name = `IDP_${employee?.name ?? 'Plan'}_${planData.plan_year}`.replace(/\s+/g, '_');
    return saveExportFile(win, `${name}.pdf`, 'pdf', buffer);
  } catch (err) {
    return { success: false, error: String(err) };
  }
});
