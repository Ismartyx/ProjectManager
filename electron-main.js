const { app, BrowserWindow, shell, ipcMain, Notification } = require('electron');
const path = require('path');
const fs = require('fs');

// تنظیم نام رسمی برنامه در ویندوز جهت دریافت پایدار نوتیفیکیشن‌های Action Center
if (process.platform === 'win32') {
    app.setAppUserModelId('com.mechave.ws');
}

// ذخیره و بازیابی هوشمند ابعاد و موقعیت پنجره در ویندوز
function getWindowStateFile() {
    try {
        return path.join(app.getPath('userData'), 'window-bounds.json');
    } catch (e) {
        return null;
    }
}

function loadSavedWindowState() {
    try {
        const file = getWindowStateFile();
        if (file && fs.existsSync(file)) {
            const data = JSON.parse(fs.readFileSync(file, 'utf8'));
            if (data && typeof data === 'object') {
                return data;
            }
        }
    } catch (e) {}
    return { width: 1200, height: 800, isMaximized: false };
}

function saveWindowState(win) {
    if (!win || win.isDestroyed()) return;
    try {
        const file = getWindowStateFile();
        if (!file) return;
        const isMax = win.isMaximized();
        if (isMax) {
            fs.writeFileSync(file, JSON.stringify({ isMaximized: true }), 'utf8');
        } else {
            const bounds = win.getBounds();
            fs.writeFileSync(file, JSON.stringify({
                isMaximized: false,
                width: bounds.width,
                height: bounds.height,
                x: bounds.x,
                y: bounds.y
            }), 'utf8');
        }
    } catch (e) {}
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
        const isWindows = process.platform === 'win32';
        const savedState = loadSavedWindowState();

        const windowOptions = {
            width: savedState.width || 1200,
            height: savedState.height || 800,
            minWidth: 320,
            minHeight: 400,
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
        };

        if (typeof savedState.x === 'number' && typeof savedState.y === 'number') {
            windowOptions.x = savedState.x;
            windowOptions.y = savedState.y;
        }

        // فعال‌سازی نوار عنوان مدرن، مینیمال و یکپارچه در ویندوز (مشابه تلگرام دسکتاپ)
        if (isWindows) {
            windowOptions.titleBarStyle = 'hidden';
            windowOptions.titleBarOverlay = {
                color: '#0f172a',
                symbolColor: '#94a3b8',
                height: 32
            };
        }

        mainWindow = new BrowserWindow(windowOptions);

        if (savedState.isMaximized) {
            mainWindow.maximize();
        }

        // ذخیره خودکار ابعاد و موقعیت هنگام تغییر اندازه یا جابجایی پنجره
        let saveTimer = null;
        const triggerSave = () => {
            clearTimeout(saveTimer);
            saveTimer = setTimeout(() => saveWindowState(mainWindow), 300);
        };
        mainWindow.on('resize', triggerSave);
        mainWindow.on('move', triggerSave);
        mainWindow.on('close', () => saveWindowState(mainWindow));

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

    // به‌روزرسانی رنگ نوار عنوان ویندوز متناسب با تم یا پالت انتخابی
    ipcMain.on('mecav-update-titlebar-overlay', (event, { color, symbolColor }) => {
        try {
            if (mainWindow && mainWindow.setTitleBarOverlay) {
                mainWindow.setTitleBarOverlay({
                    color: color || '#0f172a',
                    symbolColor: symbolColor || '#94a3b8'
                });
            }
        } catch (e) {}
    });

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
                notif.on('click', () => {
                    if (mainWindow) {
                        if (mainWindow.isMinimized()) mainWindow.restore();
                        mainWindow.show();
                        mainWindow.focus();
                    }
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

    // دانلود مستقیم فایل نصبی ویندوز درون خود برنامه همراه با درصد پیشرفت
    ipcMain.on('mecav-download-update', (event, url) => {
        const http = require('http');
        const https = require('https');
        const fs = require('fs');
        try {
            const tempFile = path.join(app.getPath('temp'), 'MechaveWS-Setup.exe');
            const fileStream = fs.createWriteStream(tempFile);
            const client = url.startsWith('https') ? https : http;

            client.get(url, (res) => {
                const total = parseInt(res.headers['content-length'] || '0', 10);
                let downloaded = 0;

                res.on('data', (chunk) => {
                    downloaded += chunk.length;
                    fileStream.write(chunk);
                    if (total > 0) {
                        const percent = Math.round((downloaded / total) * 100);
                        event.sender.send('mecav-download-progress', { status: 'progress', percent, downloaded, total });
                    }
                });

                res.on('end', () => {
                    fileStream.end();
                    event.sender.send('mecav-download-progress', { status: 'completed' });
                    setTimeout(() => {
                        shell.openPath(tempFile);
                    }, 600);
                });
            }).on('error', (err) => {
                fileStream.close();
                event.sender.send('mecav-download-progress', { status: 'error', message: err.message });
            });
        } catch (e) {
            event.sender.send('mecav-download-progress', { status: 'error', message: e.message });
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
