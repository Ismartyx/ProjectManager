package com.mechave.ws;

import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.PluginResult;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.app.DownloadManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;
import androidx.core.app.NotificationCompat;
import androidx.core.content.FileProvider;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

public class MecavNotification extends CordovaPlugin {
    private static final String CHANNEL_ID = "mecav_alerts_channel_v2";
    private static final AtomicInteger notifCounter = new AtomicInteger(1000);

    @Override
    protected void pluginInitialize() {
        super.pluginInitialize();
        createNotificationChannel();
        checkAndRequestPermission();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Context context = cordova.getActivity().getApplicationContext();
            NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "اعلان‌های مکاو",
                    NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("اعلان‌های وظایف و رویدادهای کارگاه");
                channel.enableVibration(true);
                channel.setVibrationPattern(new long[]{100, 200, 100, 250});
                channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
                manager.createNotificationChannel(channel);
            }
        }
    }

    private void checkAndRequestPermission() {
        if (Build.VERSION.SDK_INT >= 33) {
            if (!cordova.hasPermission("android.permission.POST_NOTIFICATIONS")) {
                cordova.requestPermission(this, 101, "android.permission.POST_NOTIFICATIONS");
            }
        }
    }

    private static Thread bgWorkerThread = null;
    private static volatile boolean isWorkerRunning = false;
    private static String activeTopic = null;

    @Override
    public boolean execute(String action, JSONArray args, final CallbackContext callbackContext) throws JSONException {
        if ("show".equals(action)) {
            String title = args.optString(0, "اعلان جدید مکاو");
            String body = args.optString(1, "");
            showNotification(title, body);
            callbackContext.success();
            return true;
        } else if ("requestPermission".equals(action)) {
            checkAndRequestPermission();
            callbackContext.success();
            return true;
        } else if ("downloadAndInstall".equals(action)) {
            final String apkUrl = args.optString(0, "");
            if (apkUrl == null || apkUrl.isEmpty()) {
                callbackContext.error("آدرس فایل معتبر نیست.");
                return true;
            }
            downloadAndInstallApk(apkUrl, callbackContext);
            return true;
        } else if ("downloadWithDownloadManager".equals(action)) {
            final String apkUrl = args.optString(0, "");
            if (apkUrl == null || apkUrl.isEmpty()) {
                callbackContext.error("آدرس فایل معتبر نیست.");
                return true;
            }
            downloadWithDownloadManager(apkUrl, callbackContext);
            return true;
        } else if ("openUrl".equals(action)) {
            final String url = args.optString(0, "");
            if (url != null && !url.isEmpty()) {
                cordova.getActivity().runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        try {
                            Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                            browserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            cordova.getActivity().startActivity(browserIntent);
                            callbackContext.success();
                        } catch (Exception e) {
                            callbackContext.error("خطا در باز کردن مرورگر: " + e.getMessage());
                        }
                    }
                });
                return true;
            }
            callbackContext.error("آدرس نامعتبر است");
            return true;
        } else if ("startBackgroundListener".equals(action)) {
            final String serverUrl = args.optString(0, "http://155.117.234.69:8080");
            final String topic = args.optString(1, "");
            startNativeListener(serverUrl, topic);
            callbackContext.success();
            return true;
        } else if ("stopBackgroundListener".equals(action)) {
            stopNativeListener();
            callbackContext.success();
            return true;
        }
        return false;
    }

    private synchronized void startNativeListener(final String serverUrl, final String topic) {
        if (topic == null || topic.isEmpty()) return;
        if (isWorkerRunning && topic.equals(activeTopic) && bgWorkerThread != null && bgWorkerThread.isAlive()) {
            return;
        }

        stopNativeListener();
        isWorkerRunning = true;
        activeTopic = topic;

        final Context appContext = cordova.getActivity().getApplicationContext();
        final Class<?> activityClass = cordova.getActivity().getClass();

        bgWorkerThread = new Thread(new Runnable() {
            @Override
            public void run() {
                while (isWorkerRunning) {
                    HttpURLConnection conn = null;
                    java.io.BufferedReader reader = null;
                    try {
                        String cleanUrl = serverUrl.replaceAll("/+$", "") + "/" + topic + "/sse";
                        URL url = new URL(cleanUrl);
                        conn = (HttpURLConnection) url.openConnection();
                        conn.setRequestMethod("GET");
                        conn.setRequestProperty("Accept", "text/event-stream");
                        conn.setRequestProperty("Cache-Control", "no-cache");
                        conn.setConnectTimeout(20000);
                        conn.setReadTimeout(0); // بی‌نهایت برای گوش دادن زنده در پس‌زمینه
                        conn.connect();

                        reader = new java.io.BufferedReader(new java.io.InputStreamReader(conn.getInputStream(), "UTF-8"));
                        String line;
                        while (isWorkerRunning && (line = reader.readLine()) != null) {
                            if (line.startsWith("data:")) {
                                String jsonStr = line.substring(5).trim();
                                if (!jsonStr.isEmpty()) {
                                    try {
                                        JSONObject obj = new JSONObject(jsonStr);
                                        String eventType = obj.optString("event");
                                        if (!"keepalive".equals(eventType) && !"open".equals(eventType)) {
                                            String title = obj.optString("title", "اعلان جدید مکاو");
                                            String message = obj.optString("message", "");
                                            showNotificationFromService(appContext, activityClass, title, message);
                                        }
                                    } catch (Exception ignored) {}
                                }
                            }
                        }
                    } catch (Exception e) {
                        // در صورت قطعی اینترنت، ۳ ثانیه صبر کرده و مجدد وصل می‌شود
                    } finally {
                        try { if (reader != null) reader.close(); } catch (Exception ignored) {}
                        try { if (conn != null) conn.disconnect(); } catch (Exception ignored) {}
                    }

                    try {
                        Thread.sleep(3000);
                    } catch (InterruptedException ie) {
                        break;
                    }
                }
            }
        }, "MecavNativeNtfyWorker");
        bgWorkerThread.setDaemon(true);
        bgWorkerThread.start();
    }

    private synchronized void stopNativeListener() {
        isWorkerRunning = false;
        activeTopic = null;
        if (bgWorkerThread != null) {
            bgWorkerThread.interrupt();
            bgWorkerThread = null;
        }
    }

    private static final java.util.concurrent.ConcurrentHashMap<String, Long> recentNotifsJava = new java.util.concurrent.ConcurrentHashMap<>();

    private static boolean isDuplicateNotification(String title, String body) {
        String key = (title != null ? title.trim() : "") + "|||" + (body != null ? body.trim() : "");
        long now = System.currentTimeMillis();
        Long lastTime = recentNotifsJava.get(key);
        if (lastTime != null && (now - lastTime < 12000)) {
            return true;
        }
        recentNotifsJava.put(key, now);
        if (recentNotifsJava.size() > 50) {
            for (java.util.Map.Entry<String, Long> entry : recentNotifsJava.entrySet()) {
                if (now - entry.getValue() > 30000) {
                    recentNotifsJava.remove(entry.getKey());
                }
            }
        }
        return false;
    }

    private static void showNotificationFromService(Context context, Class<?> activityClass, String title, String body) {
        if (isDuplicateNotification(title, body)) return;
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;

        Intent intent = new Intent(context, activityClass);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        
        int reqCode = notifCounter.incrementAndGet();
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            reqCode,
            intent,
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.M 
                ? (PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE) 
                : PendingIntent.FLAG_UPDATE_CURRENT
        );

        int iconRes = context.getResources().getIdentifier("ic_launcher", "mipmap", context.getPackageName());
        if (iconRes == 0) {
            iconRes = context.getResources().getIdentifier("icon", "drawable", context.getPackageName());
        }
        if (iconRes == 0) {
            iconRes = android.R.drawable.ic_dialog_info;
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(iconRes)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setAutoCancel(true)
            .setVibrate(new long[]{100, 200, 100, 250})
            .setDefaults(NotificationCompat.DEFAULT_SOUND | NotificationCompat.DEFAULT_VIBRATE | NotificationCompat.DEFAULT_LIGHTS)
            .setContentIntent(pendingIntent);

        manager.notify(reqCode, builder.build());
    }

    private void showNotification(String title, String body) {
        if (isDuplicateNotification(title, body)) return;
        Context context = cordova.getActivity().getApplicationContext();
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;

        createNotificationChannel();

        Intent intent = new Intent(context, cordova.getActivity().getClass());
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        
        int reqCode = notifCounter.incrementAndGet();
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            reqCode,
            intent,
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setAutoCancel(true)
            .setOngoing(false)
            .setContentIntent(pendingIntent);

        manager.notify(reqCode, builder.build());
    }

    private File getUpdateApkFile(Context context) {
        // ذخیره در پوشه اکسترنال برنامه برای جلوگیری از خطای دسترسی سیستم و خطای parse package
        File dir = context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        if (dir == null) {
            dir = context.getExternalCacheDir();
        }
        if (dir == null) {
            dir = new File(context.getFilesDir(), "updates");
        }
        if (!dir.exists()) {
            dir.mkdirs();
        }
        return new File(dir, "MechaveWS-update.apk");
    }

    private void downloadAndInstallApk(final String apkUrl, final CallbackContext callbackContext) {
        final Context context = cordova.getActivity().getApplicationContext();

        // بررسی دسترسی نصب برنامه‌های نامشخص در اندروید 8 و بالاتر
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (!context.getPackageManager().canRequestPackageInstalls()) {
                try {
                    Intent permIntent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                        Uri.parse("package:" + context.getPackageName()));
                    permIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    cordova.getActivity().startActivity(permIntent);
                    callbackContext.error("لطفاً اجازه نصب برنامه از این منبع را فعال کرده و سپس مجدداً دکمه نصب را بزنید.");
                    return;
                } catch (Exception ignored) {}
            }
        }

        cordova.getThreadPool().execute(new Runnable() {
            @Override
            public void run() {
                try {
                    URL url = new URL(apkUrl);
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("GET");
                    conn.setConnectTimeout(30000);
                    conn.setReadTimeout(90000);
                    conn.setRequestProperty("Accept-Encoding", "identity");
                    conn.connect();

                    int responseCode = conn.getResponseCode();
                    if (responseCode != HttpURLConnection.HTTP_OK) {
                        callbackContext.error("خطای دریافت فایل از سرور (کد " + responseCode + ")");
                        return;
                    }

                    int fileLength = conn.getContentLength();
                    File outputFile = getUpdateApkFile(context);
                    if (outputFile.exists()) {
                        outputFile.delete();
                    }

                    InputStream is = new BufferedInputStream(conn.getInputStream(), 16384);
                    OutputStream os = new FileOutputStream(outputFile);
                    byte[] buffer = new byte[16384];
                    long total = 0;
                    int count;
                    int lastPercent = -1;

                    while ((count = is.read(buffer)) != -1) {
                        total += count;
                        os.write(buffer, 0, count);

                        if (fileLength > 0) {
                            int percent = (int) ((total * 100) / fileLength);
                            if (percent != lastPercent) {
                                lastPercent = percent;
                                JSONObject progressJson = new JSONObject();
                                progressJson.put("status", "progress");
                                progressJson.put("percent", percent);
                                progressJson.put("total", fileLength);
                                progressJson.put("downloaded", total);
                                PluginResult progressResult = new PluginResult(PluginResult.Status.OK, progressJson);
                                progressResult.setKeepCallback(true);
                                callbackContext.sendPluginResult(progressResult);
                            }
                        }
                    }

                    os.flush();
                    os.close();
                    is.close();

                    // اطمینان از کامل بودن فایل دانلود شده و عدم قطعی اینترنت حین دانلود
                    if (fileLength > 0 && total < fileLength) {
                        outputFile.delete();
                        callbackContext.error("دانلود فایل ناقص بود (دریافت " + total + " از " + fileLength + " بایت). لطفاً مجدداً امتحان کنید.");
                        return;
                    }

                    if (outputFile.length() < 100000) {
                        outputFile.delete();
                        callbackContext.error("حجم فایل دانلود شده نامعتبر است.");
                        return;
                    }

                    installApk(outputFile, callbackContext);

                } catch (Exception e) {
                    callbackContext.error("خطا در فرایند دانلود: " + e.getMessage());
                }
            }
        });
    }

    private void downloadWithDownloadManager(final String apkUrl, final CallbackContext callbackContext) {
        final Context context = cordova.getActivity().getApplicationContext();
        try {
            DownloadManager downloadManager = (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
            if (downloadManager == null) {
                callbackContext.error("سرویس DownloadManager در دسترس نیست");
                return;
            }

            Uri uri = Uri.parse(apkUrl);
            DownloadManager.Request request = new DownloadManager.Request(uri);
            request.setTitle("دریافت نسخه جدید مکاو (MechaveWS)");
            request.setDescription("دانلود بسته بروزرسانی اپلیکیشن مکاو");
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setMimeType("application/vnd.android.package-archive");
            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, "MechaveWS.apk");

            final long downloadId = downloadManager.enqueue(request);

            BroadcastReceiver onComplete = new BroadcastReceiver() {
                @Override
                public void onReceive(Context c, Intent intent) {
                    long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
                    if (id == downloadId) {
                        try {
                            context.unregisterReceiver(this);
                        } catch (Exception ignored) {}

                        DownloadManager dm = (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
                        Uri downloadedUri = dm.getUriForDownloadedFile(downloadId);
                        if (downloadedUri != null) {
                            Intent installIntent = new Intent(Intent.ACTION_VIEW);
                            installIntent.setDataAndType(downloadedUri, "application/vnd.android.package-archive");
                            installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                            try {
                                cordova.getActivity().startActivity(installIntent);
                            } catch (Exception e) {
                                Intent openDownloads = new Intent(DownloadManager.ACTION_VIEW_DOWNLOADS);
                                openDownloads.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                try {
                                    cordova.getActivity().startActivity(openDownloads);
                                } catch (Exception ignored) {}
                            }
                        }
                    }
                }
            };

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.registerReceiver(onComplete, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE), Context.RECEIVER_EXPORTED);
            } else {
                context.registerReceiver(onComplete, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE));
            }

            JSONObject res = new JSONObject();
            res.put("status", "enqueued");
            res.put("downloadId", downloadId);
            callbackContext.success(res);
        } catch (Exception e) {
            callbackContext.error("خطا در ایجاد دانلود سیستمی: " + e.getMessage());
        }
    }

    private void installApk(File apkFile, CallbackContext callbackContext) {
        Context context = cordova.getActivity().getApplicationContext();
        try {
            if (!apkFile.exists() || apkFile.length() == 0) {
                callbackContext.error("فایل نصبی یافت نشد یا خالی است.");
                return;
            }

            apkFile.setReadable(true, false);
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            intent.putExtra(Intent.EXTRA_NOT_UNKNOWN_SOURCE, true);

            Uri apkUri;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                apkUri = FileProvider.getUriForFile(context, context.getPackageName() + ".fileprovider", apkFile);
            } else {
                apkUri = Uri.fromFile(apkFile);
            }

            intent.setDataAndType(apkUri, "application/vnd.android.package-archive");

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                List<ResolveInfo> resInfoList = context.getPackageManager().queryIntentActivities(intent, PackageManager.MATCH_DEFAULT_ONLY);
                if (resInfoList == null || resInfoList.isEmpty()) {
                    resInfoList = context.getPackageManager().queryIntentActivities(intent, 0);
                }
                if (resInfoList != null) {
                    for (ResolveInfo resolveInfo : resInfoList) {
                        String packageName = resolveInfo.activityInfo.packageName;
                        context.grantUriPermission(packageName, apkUri, Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                    }
                }

                String[] installerPackages = {
                    "com.google.android.packageinstaller",
                    "com.android.packageinstaller",
                    "com.miui.packageinstaller",
                    "com.samsung.android.packageinstaller",
                    "com.huawei.android.packageinstaller",
                    "com.coloros.packageinstaller",
                    "com.oppo.packageinstaller",
                    "com.vivo.packageinstaller"
                };
                for (String pkg : installerPackages) {
                    try {
                        context.grantUriPermission(pkg, apkUri, Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                    } catch (Exception ignored) {}
                }
            }

            cordova.getActivity().startActivity(intent);

            JSONObject doneJson = new JSONObject();
            doneJson.put("status", "ready_to_install");
            PluginResult doneResult = new PluginResult(PluginResult.Status.OK, doneJson);
            callbackContext.sendPluginResult(doneResult);
        } catch (Exception e) {
            callbackContext.error("خطا در اجرای نصاب: " + e.getMessage());
        }
    }
}
