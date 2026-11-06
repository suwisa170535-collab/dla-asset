const { app, BrowserWindow, Menu, shell } = require('electron');
const { fork } = require('child_process');
const path = require('path');
const http = require('http');

app.name = 'ระบบครุภัณฑ์เทศบาล';

const TARGET_URL = process.env.CLIENT_HOST || 'http://localhost:3000';
const isClientOnly = Boolean(process.env.CLIENT_HOST);

let serverProcess = null;
let mainWindow = null;

function waitForServer(url, timeoutMs, callback) {
  const startTime = Date.now();
  const tryConnect = () => {
    http.get(url, (res) => {
      callback();
    }).on('error', () => {
      if (Date.now() - startTime < timeoutMs) {
        setTimeout(tryConnect, 200);
      } else {
        callback();
      }
    });
  };
  tryConnect();
}

function startServer() {
  if (isClientOnly) {
    console.log(`Running in Client Mode connecting to: ${TARGET_URL}`);
    return;
  }
  serverProcess = fork(path.join(__dirname, 'server/index.js'), [], {
    env: { ...process.env, PORT: '3000' },
    stdio: 'inherit'
  });

  serverProcess.on('error', (err) => {
    console.error('Failed to start server process:', err);
  });
}

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

  // Auto retry if backend takes a moment to bind
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.log('Retrying connection in 1s...', errorDescription);
    setTimeout(() => {
      if (mainWindow) mainWindow.loadURL(TARGET_URL);
    }, 1000);
  });

  if (isClientOnly) {
    mainWindow.loadURL(TARGET_URL);
  } else {
    waitForServer('http://localhost:3000/api/settings', 10000, () => {
      if (mainWindow) {
        mainWindow.loadURL('http://localhost:3000');
      }
    });
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        width: 900,
        height: 1000
      }
    };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    try { serverProcess.kill(); } catch (e) {}
  }
  app.quit();
});

