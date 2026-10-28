const { app, BrowserWindow, shell, ipcMain, Notification } = require('electron');
const path = require('path');

// تنظیم نام رسمی برنامه در ویندوز جهت دریافت پایدار نوتیفیکیشن‌های Action Center
if (process.platform === 'win32') {
    app.setAppUserModelId('com.mechave.ws');
}

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
                preload: path.join(__dirname, 'electron-preload.js'),
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

    // شنود اعلان‌های نیتیو ویندوز از صفحه برنامه
    ipcMain.on('mecav-show-notification', (event, { title, body }) => {
        try {
            if (Notification.isSupported()) {
                const notif = new Notification({
                    title: title || 'مدیریت پروژه مکاو',
                    body: body || '',
                    icon: path.join(__dirname, 'icon.ico'),
                    silent: false
                });
                notif.show();
            }
        } catch (err) {
            console.error('Error showing native Windows notification:', err);
        }
    });

    // باز کردن لینک دانلود یا فایل در سیستم
    ipcMain.on('mecav-open-external', (event, url) => {
        try {
            if (url && (url.startsWith('http:') || url.startsWith('https:'))) {
                shell.openExternal(url);
            }
        } catch (err) {
            console.error('Error opening external url:', err);
        }
    });

    app.whenReady().then(() => {
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
