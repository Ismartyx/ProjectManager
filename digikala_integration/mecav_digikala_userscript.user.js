// ==UserScript==
// @name         اتصال خودکار دیجی‌کالا به سیستم مدیریت مکاو
// @namespace    https://mechave.ir/
// @version      1.0.0
// @description  تشخیص خودکار فروش جدید در پنل دیجی‌کالا و ایجاد خودکار تسک در پروژه فروش مکاو همراه با نوتیفیکیشن
// @author       Mecav Workshop
// @match        https://seller.digikala.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// @grant        GM_addStyle
// @connect      155.117.234.69
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    const MECAV_COUCHDB = 'http://155.117.234.69:5984/mecav_db_main';
    const MECAV_AUTH = 'Basic ' + btoa('admin:33995333Sma');
    const MECAV_NTFY = 'http://155.117.234.69:8080';
    const PROCESSED_ORDERS_KEY = 'mecav_processed_dk_orders';

    let isChecking = false;
    let digikalaSettings = null;

    // بارگذاری تنظیمات از سرور مکاو
    async function loadMecavSettings() {
        return new Promise((resolve) => {
            const req = (typeof GM_xmlhttpRequest !== 'undefined') ? GM_xmlhttpRequest : window.fetch;
            if (typeof GM_xmlhttpRequest !== 'undefined') {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: `${MECAV_COUCHDB}/digikala_settings?t=${Date.now()}`,
                    headers: { 'Authorization': MECAV_AUTH },
                    onload: function(res) {
                        try {
                            digikalaSettings = JSON.parse(res.responseText);
                            resolve(digikalaSettings);
                        } catch (e) {
                            resolve(null);
                        }
                    },
                    onerror: () => resolve(null)
                });
            } else {
                fetch(`${MECAV_COUCHDB}/digikala_settings?t=${Date.now()}`, {
                    headers: { 'Authorization': MECAV_AUTH }
                }).then(r => r.json()).then(data => {
                    digikalaSettings = data;
                    resolve(data);
                }).catch(() => resolve(null));
            }
        });
    }

    function getProcessedOrders() {
        try {
            return JSON.parse(localStorage.getItem(PROCESSED_ORDERS_KEY) || '[]');
        } catch (e) {
            return [];
        }
    }

    function markOrderProcessed(orderId) {
        if (!orderId) return;
        const list = getProcessedOrders();
        if (!list.includes(String(orderId))) {
            list.push(String(orderId));
            if (list.length > 500) list.shift();
            localStorage.setItem(PROCESSED_ORDERS_KEY, JSON.stringify(list));
        }
    }

    // پخش صدای زنگ اعلان فروش جدید
    function playSaleChime() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.4);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(ctx.currentTime + i * 0.15);
                osc.stop(ctx.currentTime + i * 0.15 + 0.4);
            });
        } catch (e) {}
    }

    // ایجاد تسک در دیتابیس مکاو
    async function createMecavTask(order) {
        if (!digikalaSettings) await loadMecavSettings();

        const s = digikalaSettings || {
            targetProjectId: 'project_1792433538439_z9a5e',
            targetProjectTitle: 'فروش',
            assigneeId: '100',
            finalizerId: '100',
            observers: ['100'],
            isImportant: true,
            tag: 'فروش / دیجی‌کالا'
        };

        const nowTs = Date.now();
        const nowPersian = new Date(nowTs).toLocaleDateString('fa-IR', {
            year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        const orderId = order.id || order.order_id || String(nowTs).substr(-6);
        const title = order.title || order.product_variant_title || order.product_title || 'کالای سفارشی دیجی‌کالا';
        const count = order.quantity || order.count || 1;
        const commitmentDate = order.commitment_date || order.shipping_deadline || 'نامشخص (نیاز به بررسی در پنل)';
        const price = order.price || order.selling_price || order.total_price || 0;
        const priceStr = price ? (Number(price).toLocaleString('fa-IR') + ' ریال') : 'ثبت‌شده در پنل';

        const taskDoc = {
            _id: 'task_' + nowTs + '_' + Math.random().toString(36).substr(2, 5),
            type: 'task',
            projectId: s.targetProjectId,
            title: `🛒 سفارش دیجی‌کالا: ${title} (${count} عدد)`,
            description: `یک سفارش جدید در پنل فروشندگان دیجی‌کالا ثبت شد.\n\n` +
                         `📦 عنوان کالا: ${title}\n` +
                         `🔢 شناسه سفارش: ${orderId}\n` +
                         `📊 تعداد: ${count} عدد\n` +
                         `⏰ مهلت ارسال دیجی‌کالا: ${commitmentDate}\n` +
                         `💰 مبلغ: ${priceStr}\n` +
                         `🏷️ وضعیت: در انتظار بسته‌بندی و تحویل به انبار/پست`,
            assigneeId: s.assigneeId || '100',
            finalizerId: s.finalizerId || '100',
            creatorId: '100',
            tag: s.tag || 'فروش / دیجی‌کالا',
            status: 'pending',
            transferRequest: null,
            activities: [
                {
                    id: 'act_' + nowTs,
                    type: 'create',
                    userId: '100',
                    userName: 'ربات هوشمند دیجی‌کالا',
                    text: `ثبت خودکار سفارش #${orderId} دیجی‌کالا در پروژه فروش`,
                    timestamp: nowTs,
                    dateStr: nowPersian
                }
            ],
            isImportant: s.isImportant !== false,
            deadlineTimestamp: null,
            deadlineLabel: commitmentDate,
            isPublic: false,
            observers: s.observers || ['100'],
            createdAt: nowTs,
            createdDateStr: nowPersian,
            viewedBy: ['100'],
            seenList: []
        };

        // ارسال به CouchDB
        return new Promise((resolve) => {
            const bodyStr = JSON.stringify(taskDoc);
            const sendReq = (url, method, body, headers, callback) => {
                if (typeof GM_xmlhttpRequest !== 'undefined') {
                    GM_xmlhttpRequest({ url, method, data: body, headers, onload: callback, onerror: () => resolve(false) });
                } else {
                    fetch(url, { method, headers, body }).then(r => r.json()).then(callback).catch(() => resolve(false));
                }
            };

            sendReq(`${MECAV_COUCHDB}/${taskDoc._id}`, 'PUT', bodyStr, {
                'Authorization': MECAV_AUTH,
                'Content-Type': 'application/json'
            }, (res) => {
                markOrderProcessed(orderId);
                playSaleChime();
                sendPushNotifications(taskDoc);
                showMecavToast(`✅ سفارش "${title}" با موفقیت در پروژه فروش ثبت شد!`);
                resolve(true);
            });
        });
    }

    // ارسال پوش نوتیفیکیشن لحظه‌ای به گوشی و سیستم‌ها
    function sendPushNotifications(task) {
        const notifUsers = new Set();
        if (task.assigneeId) notifUsers.add(String(task.assigneeId));
        if (Array.isArray(task.observers)) task.observers.forEach(id => notifUsers.add(String(id)));

        notifUsers.forEach(userId => {
            const topic = 'mecav_user_' + userId;
            const payload = JSON.stringify({
                topic: topic,
                title: '🛒 فروش جدید در دیجی‌کالا!',
                message: `${task.title}\nمهلت ارسال: ${task.deadlineLabel}`,
                priority: 4,
                tags: ['shopping_cart', 'package']
            });

            if (typeof GM_xmlhttpRequest !== 'undefined') {
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: MECAV_NTFY,
                    headers: { 'Content-Type': 'application/json' },
                    data: payload
                });
            } else {
                fetch(MECAV_NTFY, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: payload
                }).catch(() => {});
            }
        });
    }

    // نمایش اعلان گرافیکی روی پنل دیجی‌کالا
    function showMecavToast(msg) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 25px;
            left: 25px;
            background: #0f172a;
            color: #ffffff;
            border: 2px solid #ef394e;
            padding: 14px 20px;
            border-radius: 12px;
            font-family: inherit;
            font-size: 0.9rem;
            box-shadow: 0 10px 25px rgba(0,0,0,0.4);
            z-index: 9999999;
            direction: rtl;
            display: flex;
            align-items: center;
            gap: 10px;
            animation: slideIn 0.3s ease-out;
        `;
        toast.innerHTML = `<span>⚙️ <b>سامانه مکاو:</b> ${msg}</span>`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 7000);
    }

    // اسکن سفارش‌ها از داشبورد یا اندپوینت‌های پنل
    async function checkDigikalaOrders() {
        if (isChecking) return;
        isChecking = true;
        updateBadge('در حال بررسی...', '#f59e0b');

        try {
            // ۱. تلاش برای بررسی از طریق API اختصاصی فروشنده در همان مرورگر (با کوکی جاری لاگین)
            const apiRes = await fetch('/api/v1/seller/dashboard/', { credentials: 'include' }).catch(() => null);
            if (apiRes && apiRes.ok) {
                const data = await apiRes.json();
                handleDashboardData(data);
            } else {
                // ۲. اگر API مستقیم در دسترس نبود، اسکن متن‌های موجود در صفحه
                scanDOMForOrders();
            }
        } catch (e) {
            scanDOMForOrders();
        } finally {
            isChecking = false;
            updateBadge('متصل به مکاو 🟢', '#10b981');
        }
    }

    function handleDashboardData(data) {
        if (!data || !data.data) return;
        const d = data.data;
        const todayOrders = d.today_orders_count || (d.orders && d.orders.today) || 0;
        const futureCommitments = d.future_commitments_count || 0;

        if (todayOrders > 0 || futureCommitments > 0) {
            // درخواست لیست تفصیلی سفارش‌های باز
            fetchOrderDetailsAndSync();
        }
    }

    // استخراج جزئیات سفارش‌های فعال
    async function fetchOrderDetailsAndSync() {
        try {
            const res = await fetch('/api/v1/orders/?page=1&size=20', { credentials: 'include' }).catch(() => null);
            if (res && res.ok) {
                const json = await res.json();
                const items = json?.data?.items || json?.items || [];
                const processed = getProcessedOrders();

                for (const item of items) {
                    const id = item.order_id || item.id;
                    if (id && !processed.includes(String(id))) {
                        await createMecavTask({
                            id: id,
                            title: item.product_variant_title || item.title || 'محصول دیجی‌کالا',
                            quantity: item.quantity || 1,
                            commitment_date: item.commitment_date || item.shipping_deadline || '',
                            price: item.selling_price || item.total_price || 0
                        });
                    }
                }
                return;
            }
        } catch (e) {}

        // روش جایگزین: اسکن جدول سفارش‌ها در صورت باز بودن تب سفارشات
        scanDOMForOrders();
    }

    // اسکن المان‌های صفحه داشبورد
    function scanDOMForOrders() {
        const text = document.body.innerText;
        // بررسی عدد جلوی "سفارش‌های امروز" یا "تعهدات ارسال آینده"
        const todayMatch = text.match(/سفارش‌های امروز\s*(\d+)/);
        const futureMatch = text.match(/تعهدات ارسال آینده\s*(\d+)/);

        const countToday = todayMatch ? parseInt(todayMatch[1], 10) : 0;
        const countFuture = futureMatch ? parseInt(futureMatch[1], 10) : 0;

        if (countToday > 0 || countFuture > 0) {
            const processed = getProcessedOrders();
            const orderKey = `order_detected_${new Date().toLocaleDateString('fa-IR')}`;
            if (!processed.includes(orderKey)) {
                createMecavTask({
                    id: orderKey,
                    title: 'سفارش جدید دریافتی (جهت مشاهده نام کالا به تب سفارش‌ها بروید)',
                    quantity: countToday || countFuture,
                    commitment_date: 'تعهد ارسال آینده در پنل',
                    price: 0
                });
            }
        }
    }

    // ویجت شناور مکاو در گوشه پنل دیجی‌کالا
    let badgeEl = null;
    function createMecavWidget() {
        if (document.getElementById('mecav-sync-widget')) return;

        const widget = document.createElement('div');
        widget.id = 'mecav-sync-widget';
        widget.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #1e293b;
            color: #ffffff;
            border: 1px solid #334155;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            border-radius: 12px;
            padding: 10px 14px;
            font-size: 0.8rem;
            z-index: 999999;
            direction: rtl;
            display: flex;
            align-items: center;
            gap: 10px;
            font-family: inherit;
        `;

        widget.innerHTML = `
            <div style="display: flex; flex-direction: column;">
                <b style="font-size: 0.82rem; color: #f8fafc;">مدیریت پروژه مکاو</b>
                <span id="mecav-badge-status" style="font-size: 0.72rem; color: #10b981;">متصل به مکاو 🟢</span>
            </div>
            <button id="btnMecavManualSync" style="background: #ef394e; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; font-family: inherit;">
                🔄 بررسی و ثبت در فروش
            </button>
        `;

        document.body.appendChild(widget);
        badgeEl = document.getElementById('mecav-badge-status');

        document.getElementById('btnMecavManualSync').addEventListener('click', () => {
            showMecavToast('در حال بررسی سفارش‌های جدید دیجی‌کالا...');
            checkDigikalaOrders();
        });
    }

    function updateBadge(text, color) {
        if (badgeEl) {
            badgeEl.innerText = text;
            badgeEl.style.color = color;
        }
    }

    // شروع کار
    window.addEventListener('load', () => {
        setTimeout(() => {
            createMecavWidget();
            loadMecavSettings();
            checkDigikalaOrders();

            // بررسی خودکار هر ۹۰ ثانیه
            setInterval(checkDigikalaOrders, 90000);
        }, 3000);
    });

})();
