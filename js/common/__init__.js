angular.module('talon.common', [
    'ngStorage',
    'ngCordova',
    'talon.constants',
    'pouchdb',
    'gettext'
])

;

if (DEBUG) {
    if (!window.plugins) {
        window.plugins = {};
    }
    if (!window.plugins.spinnerDialog) {
        window.plugins.spinnerDialog = {
            show: function () {
                return true;
            },
            hide: function () {
                return true;
            },
        };

    }
}
