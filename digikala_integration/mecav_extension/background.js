// پس‌زمینه افزونه مکاو - جلوگیری ۱۰۰٪ قطعی از ثبت تسک تکراری با بررسی دیتابیس سرور
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
        const dkpc = String(task.dkpc || '').replace(/\D/g, ''); // فقط ارقام DKPC

        // ۱. ابتدا بررسی تمام اسناد دیتابیس برای اطمینان قطعی از عدم وجود تسک با این DKPC
        fetch(`${MECAV_COUCHDB}/_all_docs?include_docs=true`, {
            headers: { 'Authorization': MECAV_AUTH }
        })
        .then(res => res.json())
        .then(allDocs => {
            const rows = allDocs.rows || [];
            
            // بررسی آیا تسکی با این کد دیجی‌کالا در دیتابیس وجود دارد؟
            const existing = rows.find(r => {
                const doc = r.doc;
                if (!doc || doc.type !== 'task' || doc.isArchived) return false;
                if (dkpc && (doc.dkpc === dkpc || (doc._id && doc._id.includes(dkpc)))) return true;
                if (dkpc && doc.description && doc.description.includes(dkpc)) return true;
                if (doc._id === task._id) return true;
                return false;
            });

            if (existing) {
                console.log(`[Mecav Sync] تسک مربوط به DKPC-${dkpc} قبلاً در سیستم ثبت شده است (شناسه: ${existing.doc._id}). ایجاد تسک مجدد متوقف شد.`);
                sendResponse({ success: false, alreadyExists: true, existingId: existing.doc._id });
                return;
            }

            // ۲. اگر وجود نداشت، تسک را با شناسه یکتا در سرور ذخیره کن
            task._id = `task_dk_${dkpc || Date.now()}`;
            task.dkpc = dkpc;

            return fetch(`${MECAV_COUCHDB}/${task._id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': MECAV_AUTH,
                    'Content-Type': 'application/json; charset=utf-8'
                },
                body: JSON.stringify(task)
            })
            .then(res => res.json())
            .then(data => {
                if (data.ok) {
                    sendResponse({ success: true, data });
                } else {
                    sendResponse({ success: false, error: data.reason });
                }
            });
        })
        .catch(err => {
            console.error('[Mecav Sync Error]', err);
            sendResponse({ success: false, error: err.message });
        });

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
