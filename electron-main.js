import electron from 'electron';
const { app, BrowserWindow, Menu, shell } = electron;
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Start embedded Express + SQLite backend server
import './server/index.js';

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    title: 'ระบบบริหารจัดการครุภัณฑ์และพัสดุคลังย่อย เทศบาล/อบต.',
    backgroundColor: '#f8fafc',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Load backend server URL
  setTimeout(() => {
    mainWindow.loadURL('http://localhost:3000');
  }, 600);

  // Handle print windows and external links properly
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // If it's about:blank or print window, allow it to open in a child Electron window
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        width: 900,
        height: 1000,
        autoHideMenuBar: true
      }
    };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
