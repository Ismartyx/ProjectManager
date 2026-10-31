package com.mechave.ws;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import androidx.core.app.NotificationCompat;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * سرویس پس‌زمینه ماندگار (Foreground Service) جهت اتصال ۲۴ ساعته به سرور نوتیفیکیشن
 * حتی با بستن کامل برنامه یا ریستارت شدن گوشی قطع نمی‌شود (مشابه تلگرام).
 */
public class MecavBackgroundService extends Service {
    public static final String SERVICE_CHANNEL_ID = "mecav_fg_service_channel_v1";
    public static final int SERVICE_NOTIF_ID = 9001;
    public static final String PREFS_NAME = "mecav_push_prefs";
    public static final String PREF_KEY_SERVER_URL = "server_url";
    public static final String PREF_KEY_TOPIC = "topic";

    private volatile boolean isRunning = false;
    private Thread workerThread = null;
    private PowerManager.WakeLock wakeLock = null;
    private String currentServerUrl = null;
    private String currentTopic = null;

    @Override
    public void onCreate() {
        super.onCreate();
        createForegroundChannel();
        startInForeground();
        acquireWakeLock();
    }

    private void createForegroundChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                NotificationChannel channel = new NotificationChannel(
                    SERVICE_CHANNEL_ID,
                    "سرویس اتصال زنده کارگاه مکاو",
                    NotificationManager.IMPORTANCE_LOW
                );
                channel.setDescription("حفظ اتصال زنده جهت دریافت آنی وظایف و اعلان‌ها در پس‌زمینه");
                channel.setShowBadge(false);
                channel.enableVibration(false);
                channel.setSound(null, null);
                manager.createNotificationChannel(channel);
            }
        }
    }

    private void startInForeground() {
        Intent launchIntent = null;
        try {
            launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        } catch (Exception ignored) {}

        PendingIntent pendingIntent = null;
        if (launchIntent != null) {
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            pendingIntent = PendingIntent.getActivity(
                this,
                0,
                launchIntent,
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                    ? (PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE)
                    : PendingIntent.FLAG_UPDATE_CURRENT
            );
        }

        int iconRes = getResources().getIdentifier("ic_launcher", "mipmap", getPackageName());
        if (iconRes == 0) iconRes = getResources().getIdentifier("icon", "drawable", getPackageName());
        if (iconRes == 0) iconRes = android.R.drawable.ic_dialog_info;

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, SERVICE_CHANNEL_ID)
            .setSmallIcon(iconRes)
            .setContentTitle("مدیریت کارگاه مکاو")
            .setContentText("سرویس اعلان زنده کارگاه فعال است")
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setShowWhen(false);

        if (pendingIntent != null) {
            builder.setContentIntent(pendingIntent);
        }

        Notification notification = builder.build();

        if (Build.VERSION.SDK_INT >= 34) {
            try {
                startForeground(SERVICE_NOTIF_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
            } catch (Exception e) {
                startForeground(SERVICE_NOTIF_ID, notification);
            }
        } else {
            startForeground(SERVICE_NOTIF_ID, notification);
        }
    }

    private void acquireWakeLock() {
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null && (wakeLock == null || !wakeLock.isHeld())) {
                wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "MechaveWS:PushSync");
                wakeLock.setReferenceCounted(false);
                wakeLock.acquire(60 * 60 * 1000L); // تمدید خودکار
            }
        } catch (Exception ignored) {}
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && "ACTION_STOP".equals(intent.getAction())) {
            stopSelf();
            return START_NOT_STICKY;
        }

        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String serverUrl = intent != null ? intent.getStringExtra("serverUrl") : null;
        String topic = intent != null ? intent.getStringExtra("topic") : null;

        if (serverUrl == null || serverUrl.isEmpty()) {
            serverUrl = prefs.getString(PREF_KEY_SERVER_URL, "http://155.117.234.69:8080");
        } else {
            prefs.edit().putString(PREF_KEY_SERVER_URL, serverUrl).apply();
        }

        if (topic == null || topic.isEmpty()) {
            topic = prefs.getString(PREF_KEY_TOPIC, null);
        } else {
            prefs.edit().putString(PREF_KEY_TOPIC, topic).apply();
        }

        currentServerUrl = serverUrl;
        currentTopic = topic;

        if (topic != null && !topic.isEmpty()) {
            startWorker(serverUrl, topic);
        }

        return START_STICKY;
    }

    private synchronized void startWorker(final String serverUrl, final String topic) {
        if (isRunning && workerThread != null && workerThread.isAlive()) {
            return;
        }

        isRunning = true;
        workerThread = new Thread(new Runnable() {
            @Override
            public void run() {
                while (isRunning) {
                    HttpURLConnection conn = null;
                    BufferedReader reader = null;
                    try {
                        String cleanUrl = serverUrl.replaceAll("/+$", "") + "/" + topic + "/sse";
                        URL url = new URL(cleanUrl);
                        conn = (HttpURLConnection) url.openConnection();
                        conn.setRequestMethod("GET");
                        conn.setRequestProperty("Accept", "text/event-stream");
                        conn.setRequestProperty("Cache-Control", "no-cache");
                        conn.setConnectTimeout(25000);
                        conn.setReadTimeout(0); // گوش دادن مداوم و بی‌پایان به رویدادها
                        conn.connect();

                        reader = new BufferedReader(new InputStreamReader(conn.getInputStream(), "UTF-8"));
                        String line;
                        while (isRunning && (line = reader.readLine()) != null) {
                            if (line.startsWith("data:")) {
                                String jsonStr = line.substring(5).trim();
                                if (!jsonStr.isEmpty()) {
                                    handleEventPayload(jsonStr);
                                }
                            }
                        }
                    } catch (Exception e) {
                        // در صورت قطعی شبکه چند ثانیه صبر و تلاش مجدد
                    } finally {
                        try { if (reader != null) reader.close(); } catch (Exception ignored) {}
                        try { if (conn != null) conn.disconnect(); } catch (Exception ignored) {}
                    }

                    try {
                        Thread.sleep(4000);
                    } catch (InterruptedException ie) {
                        break;
                    }
                }
            }
        }, "MecavPersistentPushWorker");
        workerThread.setDaemon(true);
        workerThread.start();
    }

    private void handleEventPayload(String jsonStr) {
        try {
            JSONObject obj = new JSONObject(jsonStr);
            String eventType = obj.optString("event");
            if ("keepalive".equals(eventType) || "open".equals(eventType)) {
                return;
            }

            String title = obj.optString("title", "اعلان جدید مکاو");
            String message = obj.optString("message", "");

            Class<?> activityClass = null;
            try {
                Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
                if (launchIntent != null && launchIntent.getComponent() != null) {
                    activityClass = Class.forName(launchIntent.getComponent().getClassName());
                }
            } catch (Exception ignored) {}
            if (activityClass == null) {
                try {
                    activityClass = Class.forName("com.mechave.ws.MainActivity");
                } catch (Exception ignored) {}
            }

            if (activityClass != null) {
                MecavNotification.showNotificationFromService(getApplicationContext(), activityClass, title, message);
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onDestroy() {
        isRunning = false;
        if (workerThread != null) {
            workerThread.interrupt();
            workerThread = null;
        }
        if (wakeLock != null && wakeLock.isHeld()) {
            try { wakeLock.release(); } catch (Exception ignored) {}
            wakeLock = null;
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
