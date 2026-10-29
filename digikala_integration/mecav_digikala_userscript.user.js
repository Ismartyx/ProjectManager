// ==UserScript==
// @name         اتصال خودکار دیجی‌کالا به سیستم مدیریت مکاو
// @namespace    https://mechave.ir/
// @version      1.2.0
// @description  تشخیص خودکار فروش جدید در تعهدات ارسال دیجی‌کالا و ایجاد تسک یکتا در پروژه فروش مکاو با جلوگیری از ثبت تکراری
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
    const PROCESSED_ORDERS_KEY = 'mecav_processed_dk_orders_v3';

    let isChecking = false;
    let digikalaSettings = null;

    function getProcessedOrders() {
        try {
            return JSON.parse(localStorage.getItem(PROCESSED_ORDERS_KEY) || '[]');
        } catch (e) {
            return [];
        }
    }

    function markOrderProcessed(orderKey) {
        if (!orderKey) return;
        const list = getProcessedOrders();
        if (!list.includes(String(orderKey))) {
            list.push(String(orderKey));
            if (list.length > 500) list.shift();
            localStorage.setItem(PROCESSED_ORDERS_KEY, JSON.stringify(list));
        }
    }

    function playSaleChime() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const notes = [523.25, 659.25, 783.99, 1046.50];
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

    async function loadMecavSettings() {
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: `${MECAV_COUCHDB}/digikala_settings?t=${Date.now()}`,
                headers: { 'Authorization': MECAV_AUTH },
                onload: (res) => {
                    try {
                        digikalaSettings = JSON.parse(res.responseText);
                        resolve(digikalaSettings);
                    } catch (e) {
                        resolve(null);
                    }
                },
                onerror: () => resolve(null)
            });
        });
    }

    async function fetchExactDeadline(cleanDkpc) {
        if (!cleanDkpc) return '';
        try {
            const res = await fetch(`https://seller.digikala.com/pwa/orders/ship-by-digikala/${cleanDkpc}`, { credentials: 'include' });
            if (res.ok) {
                const html = await res.text();
                const match = html.match(/تا\s+\d+\s+[\u0600-\u06FF]+/);
                if (match) return match[0];
            }
        } catch (e) {}
        return '';
    }

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

        const cleanDkpc = String(order.dkpc || '').replace(/\D/g, '');

        // بررسی در سرور قبل از ایجاد
        const alreadyExists = await new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: `${MECAV_COUCHDB}/_all_docs?include_docs=true`,
                headers: { 'Authorization': MECAV_AUTH },
                onload: (res) => {
                    try {
                        const json = JSON.parse(res.responseText);
                        const exists = (json.rows || []).some(r => {
                            const d = r.doc;
                            if (!d || d.type !== 'task' || d.isArchived) return false;
                            if (cleanDkpc && (d.dkpc === cleanDkpc || (d._id && d._id.includes(cleanDkpc)))) return true;
                            if (cleanDkpc && d.description && d.description.includes(cleanDkpc)) return true;
                            return false;
                        });
                        resolve(exists);
                    } catch (e) {
                        resolve(false);
                    }
                },
                onerror: () => resolve(false)
            });
        });

        if (alreadyExists) {
            markOrderProcessed(cleanDkpc);
            console.log(`[Mecav Sync] تسک مربوط به DKPC-${cleanDkpc} قبلاً ثبت شده است.`);
            return false;
        }

        const nowTs = Date.now();
        const nowPersian = new Date(nowTs).toLocaleDateString('fa-IR', {
            year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        const exactDeadline = (await fetchExactDeadline(cleanDkpc)) || order.deadline || 'تعهد ارسال آینده در پنل';
        const title = order.title || 'کالای سفارشی دیجی‌کالا';
        const count = order.count || 1;
        const dkp = order.dkp ? `\n🆔 کد کالا (DKP): ${order.dkp}` : '';
        const dkpcFull = cleanDkpc ? `\n🔢 کد تنوع: DKPC-${cleanDkpc}` : '';

        const taskDoc = {
            _id: `task_dk_${cleanDkpc || nowTs}`,
            dkpc: cleanDkpc,
            type: 'task',
            projectId: s.targetProjectId,
            title: `🛒 سفارش دیجی‌کالا: ${title} (${count} عدد)`,
            description: `سفارش جدید دیجی‌کالا در بخش تعهدات ارسال ثبت شد.\n\n` +
                         `📦 نام کالا: ${title}${dkpcFull}${dkp}\n` +
                         `📊 تعداد فروخته‌شده: ${count} عدد\n` +
                         `⏰ مهلت تعهد ارسال دیجی‌کالا: ${exactDeadline}\n` +
                         `🏷️ وضعیت تعهد: در انتظار بسته‌بندی و تحویل به انبار/پست\n` +
                         `🔗 لینک بررسی در پنل: https://seller.digikala.com/pwa/orders/ship-by-digikala/${cleanDkpc}\n` +
                         `🤖 ثبت‌شده خودکار توسط: ربات دیجی‌کالا`,
            assigneeId: s.assigneeId || '100',
            finalizerId: s.finalizerId || '100',
            creatorId: 'digikala_bot',
            tag: s.tag || 'فروش / دیجی‌کالا',
            status: 'pending',
            transferRequest: null,
            activities: [
                {
                    id: 'act_' + nowTs,
                    type: 'create',
                    userId: 'digikala_bot',
                    userName: 'ربات دیجی‌کالا',
                    text: `ثبت خودکار سفارش [${title}] در پروژه فروش`,
                    timestamp: nowTs,
                    dateStr: nowPersian
                }
            ],
            isImportant: s.isImportant !== false,
            deadlineTimestamp: null,
            deadlineLabel: exactDeadline,
            isPublic: false,
            observers: s.observers || ['100'],
            createdAt: nowTs,
            createdDateStr: nowPersian,
            viewedBy: ['100'],
            seenList: []
        };

        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                url: `${MECAV_COUCHDB}/${taskDoc._id}`,
                method: 'PUT',
                data: JSON.stringify(taskDoc),
                headers: {
                    'Authorization': MECAV_AUTH,
                    'Content-Type': 'application/json; charset=utf-8'
                },
                onload: () => {
                    markOrderProcessed(cleanDkpc);
                    playSaleChime();
                    sendPushNotifications(taskDoc);
                    showMecavToast(`✅ سفارش "${title}" با موفقیت در پروژه فروش ثبت شد!`);
                    resolve(true);
                },
                onerror: () => resolve(false)
            });
        });
    }

    function sendPushNotifications(task) {
        const notifUsers = new Set();
        if (task.assigneeId) notifUsers.add(String(task.assigneeId));
        if (Array.isArray(task.observers)) task.observers.forEach(id => notifUsers.add(String(id)));

        notifUsers.forEach(userId => {
            const topic = 'mecav_user_' + userId;
            const payload = {
                topic: topic,
                title: '🛒 فروش جدید در دیجی‌کالا!',
                message: `${task.title}\nمهلت ارسال: ${task.deadlineLabel}`,
                priority: 4,
                tags: ['shopping_cart', 'package']
            };

            GM_xmlhttpRequest({
                url: MECAV_NTFY,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(payload)
            });
        });
    }

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
        `;
        toast.innerHTML = `<span>⚙️ <b>سامانه مکاو:</b> ${msg}</span>`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 7000);
    }

    function extractOrdersFromDocument(doc) {
        const orders = [];
        const elements = doc.querySelectorAll('*');
        const dkpcElements = [];

        for (const el of elements) {
            if (el.children.length === 0 && el.innerText && /DKPC-\d+/i.test(el.innerText)) {
                dkpcElements.push(el);
            }
        }

        for (const el of dkpcElements) {
            const dkpcMatch = el.innerText.match(/DKPC-\d+/i);
            const dkpc = dkpcMatch ? dkpcMatch[0] : '';
            const cleanDkpc = dkpc.replace(/\D/g, '');
            
            let row = el.closest('tr') || el.closest('[class*="row"]') || el.parentElement.parentElement;
            let title = '';
            let dkp = '';
            let count = 1;

            if (row) {
                const candidateTexts = Array.from(row.querySelectorAll('*'))
                    .filter(n => n.children.length === 0 && n.innerText && n.innerText.trim().length > 10 && !n.innerText.includes('DKPC') && !n.innerText.includes('DKP'))
                    .map(n => n.innerText.trim());

                if (candidateTexts.length > 0) {
                    candidateTexts.sort((a, b) => b.length - a.length);
                    title = candidateTexts[0];
                }

                const dkpMatch = row.innerText.match(/\b(2\d{7}|\d{8})\b/);
                if (dkpMatch) dkp = dkpMatch[0];

                const nums = row.innerText.match(/\b\d+\b/g);
                if (nums && nums.length > 0) {
                    const validNums = nums.map(Number).filter(n => n > 0 && n < 100);
                    if (validNums.length > 0) count = validNums[0];
                }
            }

            if (cleanDkpc) {
                orders.push({
                    dkpc: cleanDkpc,
                    dkp: dkp,
                    title: title || 'کالای ثبت‌شده در تعهدات ارسال',
                    count: count
                });
            }
        }

        return orders;
    }

    async function checkDigikalaOrders() {
        if (isChecking) return;
        isChecking = true;
        updateBadge('در حال بررسی...', '#f59e0b');

        try {
            const isOrdersPage = window.location.href.includes('/orders');

            if (isOrdersPage) {
                const orders = extractOrdersFromDocument(document);
                for (const o of orders) {
                    await createMecavTask(o);
                }
            } else {
                const pageText = document.body.innerText;
                const pastTodayMatch = pageText.match(/تعهدات ارسال گذشته و امروز\s*(\d+)/);
                const futureMatch = pageText.match(/تعهدات ارسال آینده\s*(\d+)/);

                const pastToday = pastTodayMatch ? parseInt(pastTodayMatch[1], 10) : 0;
                const future = futureMatch ? parseInt(futureMatch[1], 10) : 0;

                if (pastToday > 0 || future > 0) {
                    const ordersUrl = 'https://seller.digikala.com/pwa/orders?sort=variant_id&page=1';
                    const res = await fetch(ordersUrl, { credentials: 'include' }).catch(() => null);
                    if (res && res.ok) {
                        const html = await res.text();
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(html, 'text/html');
                        const orders = extractOrdersFromDocument(doc);
                        for (const o of orders) {
                            await createMecavTask(o);
                        }
                    }
                }
            }
        } catch (e) {
            console.error('[Mecav Sync]', e);
        } finally {
            isChecking = false;
            updateBadge('متصل به مکاو 🟢', '#10b981');
        }
    }

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
            showMecavToast('در حال استخراج نام کالا و بررسی سفارش‌های جدید...');
            checkDigikalaOrders();
        });
    }

    function updateBadge(text, color) {
        if (badgeEl) {
            badgeEl.innerText = text;
            badgeEl.style.color = color;
        }
    }

    window.addEventListener('load', () => {
        setTimeout(() => {
            createMecavWidget();
            loadMecavSettings();
            checkDigikalaOrders();
            setInterval(checkDigikalaOrders, 60000);
        }, 2000);
    });

})();
