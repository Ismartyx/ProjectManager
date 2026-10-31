var exec = require('cordova/exec');

var MecavNotification = {
    show: function(title, body, taskId, onSuccess, onError) {
        exec(onSuccess, onError, 'MecavNotification', 'show', [title, body, taskId]);
    },
    requestPermission: function(onSuccess, onError) {
        exec(onSuccess, onError, 'MecavNotification', 'requestPermission', []);
    },
    downloadAndInstall: function(apkUrl, onSuccess, onError, onProgress) {
        exec(function(res) {
            if (res && res.status === 'progress' && typeof onProgress === 'function') {
                onProgress(res);
            } else if (typeof onSuccess === 'function') {
                onSuccess(res);
            }
        }, onError, 'MecavNotification', 'downloadAndInstall', [apkUrl]);
    },
    downloadWithDownloadManager: function(apkUrl, onSuccess, onError) {
        exec(onSuccess, onError, 'MecavNotification', 'downloadWithDownloadManager', [apkUrl]);
    },
    openUrl: function(url, onSuccess, onError) {
        exec(onSuccess, onError, 'MecavNotification', 'openUrl', [url]);
    },
    startBackgroundListener: function(serverUrl, topic, onSuccess, onError) {
        exec(onSuccess, onError, 'MecavNotification', 'startBackgroundListener', [serverUrl, topic]);
    },
    stopBackgroundListener: function(onSuccess, onError) {
        exec(onSuccess, onError, 'MecavNotification', 'stopBackgroundListener', []);
    },
    requestBatteryExemption: function(onSuccess, onError) {
        exec(onSuccess, onError, 'MecavNotification', 'requestBatteryExemption', []);
    }
};

module.exports = MecavNotification;
