// پس‌زمینه افزونه مکاو - دور زدن کامل محدودیت‌های Mixed Content و CORS مرورگر
const MECAV_COUCHDB = 'http://155.117.234.69:5984/mecav_db_main';
const MECAV_AUTH = 'Basic ' + btoa('admin:33995333Sma');
const MECAV_NTFY = 'http://155.117.234.69:8080';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'GET_SETTINGS') {
        fetch(`${MECAV_COUCHDB}/digikala_settings?t=${Date.now()}`, {
            headers: { 'Authorization': MECAV_AUTH }
        })
        .then(res => res.json())
        .then(data => sendResponse({ success: true, data }))
        .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }

    if (request.action === 'SAVE_TASK') {
        const task = request.task;
        fetch(`${MECAV_COUCHDB}/${task._id}`, {
            method: 'PUT',
            headers: {
                'Authorization': MECAV_AUTH,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(task)
        })
        .then(res => res.json())
        .then(data => sendResponse({ success: true, data }))
        .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }

    if (request.action === 'SEND_PUSH') {
        const payload = request.payload;
        fetch(MECAV_NTFY, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(res => sendResponse({ success: true }))
        .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }
});
