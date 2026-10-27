var exec = require('cordova/exec');

var MecavNotification = {
    show: function(title, body, success, error) {
        exec(success, error, 'MecavNotification', 'show', [title, body]);
    }
};

module.exports = MecavNotification;
