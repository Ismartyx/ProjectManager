package com.mechave.ws;

import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CallbackContext;
import org.json.JSONArray;
import org.json.JSONException;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;
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

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
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
        }
        return false;
    }

    private void showNotification(String title, String body) {
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
}
