var exec = require('cordova/exec');

var MecavNotification = {
    show: function(title, body, success, error) {
        exec(success, error, 'MecavNotification', 'show', [title, body]);
    },
    downloadAndInstall: function(apkUrl, onProgress, onSuccess, onError) {
        exec(function(res) {
            if (res && res.status === 'progress') {
                if (typeof onProgress === 'function') onProgress(res.percent, res.downloaded, res.total);
            } else if (res && res.status === 'ready_to_install') {
                if (typeof onSuccess === 'function') onSuccess(res);
            }
        }, function(err) {
            if (typeof onError === 'function') onError(err);
        }, 'MecavNotification', 'downloadAndInstall', [apkUrl]);
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
    }
};

module.exports = MecavNotification;
