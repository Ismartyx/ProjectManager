const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

// جلوگیری از اجرای هم‌زمان چند نسخه از برنامه روی ویندوز
const gotTheLock = app.requestSingleInstanceLock();
let mainWindow = null;

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    function createWindow() {
        mainWindow = new BrowserWindow({
            width: 1366,
            height: 850,
            minWidth: 960,
            minHeight: 600,
            title: 'مدیریت پروژه مکاو',
            icon: path.join(__dirname, 'icon.ico'),
            autoHideMenuBar: true,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                webSecurity: false, // دسترسی مستقیم به شبکه محلی و اینترنت بدون محدودیت CORS
                allowRunningInsecureContent: true
            }
        });

        // باز کردن لینک‌های خارجی در مرورگر اصلی سیستم
        mainWindow.webContents.setWindowOpenHandler(({ url }) => {
            if (url.startsWith('http:') || url.startsWith('https:')) {
                shell.openExternal(url);
                return { action: 'deny' };
            }
            return { action: 'allow' };
        });

        mainWindow.loadFile(path.join(__dirname, 'index.html'));

        mainWindow.on('closed', () => {
            mainWindow = null;
        });
    }

    app.whenReady().then(() => {
        // شناسه استاندارد جهت اتصال مستقیم نوتیفیکیشن‌ها به Action Center ویندوز
        if (process.platform === 'win32') {
            app.setAppUserModelId('com.mechave.ws');
        }
        createWindow();

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) createWindow();
        });
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });
}
