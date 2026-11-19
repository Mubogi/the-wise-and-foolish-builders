const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('node:path');

// Game assets are bundled next to main.js at build time.
const GAME_INDEX = path.join(__dirname, 'www', 'index.html');

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 900,
    minHeight: 620,
    backgroundColor: '#0d1219',
    show: false,
    autoHideMenuBar: true,
    title: 'The Wise & Foolish Builders',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  win.once('ready-to-show', () => win.show());
  win.loadFile(GAME_INDEX);

  // Keep external links out of the game window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  // Save the player's progress before the window closes.
  win.on('close', () => {
    win.webContents
      .executeJavaScript('try{window.__twfb&&window.__twfb.engine.save()}catch(e){}')
      .catch(() => {});
  });
}

const template = [
  {
    label: 'Game',
    submenu: [
      { role: 'reload', label: 'Reload' },
      { role: 'toggleDevTools', label: 'Developer Tools' },
      { type: 'separator' },
      { role: 'togglefullscreen', label: 'Full Screen' },
      { type: 'separator' },
      { role: 'quit', label: 'Quit' },
    ],
  },
  {
    label: 'Edit',
    submenu: [{ role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }],
  },
];

app.whenReady().then(() => {
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
