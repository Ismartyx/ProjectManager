package com.mechave.ws;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

/**
 * دریافت‌کننده سیستمی راه‌اندازی دستگاه (Boot Receiver)
 * با روشن شدن گوشی یا آپدیت برنامه، سرویس پس‌زمینه را فوراً فعال می‌کند.
 */
public class MecavBootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) ||
            Intent.ACTION_MY_PACKAGE_REPLACED.equals(action) ||
            "android.intent.action.QUICKBOOT_POWERON".equals(action) ||
            "com.htc.intent.action.QUICKBOOT_POWERON".equals(action)) {

            SharedPreferences prefs = context.getSharedPreferences(MecavBackgroundService.PREFS_NAME, Context.MODE_PRIVATE);
            String serverUrl = prefs.getString(MecavBackgroundService.PREF_KEY_SERVER_URL, "http://155.117.234.69:8080");
            String topic = prefs.getString(MecavBackgroundService.PREF_KEY_TOPIC, null);

            if (topic != null && !topic.isEmpty()) {
                Intent serviceIntent = new Intent(context, MecavBackgroundService.class);
                serviceIntent.putExtra("serverUrl", serverUrl);
                serviceIntent.putExtra("topic", topic);

                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        context.startForegroundService(serviceIntent);
                    } else {
                        context.startService(serviceIntent);
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        }
    }
}
