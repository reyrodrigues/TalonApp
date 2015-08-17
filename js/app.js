/* global window */

// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
angular.module('talon', ['ionic',
    'talon.constants',
    'talon.controllers',
    'talon.templates',
    'talon.auth',
    'talon.beneficiary',
    'talon.common',
    'talon.nfc',
    'talon.transaction',
    'gettext'
])

.run(function ($ionicPlatform, $rootScope, $timeout, $localStorage, gettextCatalog, $ionicHistory) {
    $rootScope.$watch('currentLocale', function () {
        gettextCatalog.setCurrentLanguage($rootScope.currentLocale);
        moment.locale($rootScope.currentLocale);

        var rtl = ['ar', 'he'];
        $rootScope.currentDirection = rtl.indexOf($rootScope.currentLocale) > -1 ? 'right' : 'left';
    })


    $rootScope.currentLocale = 'en';

    if ($localStorage.currentUser) {

        $rootScope.currentUser = $localStorage.currentUser;
        $rootScope.organization = $localStorage.currentUser.Organization;
        $rootScope.country = $localStorage.country;
        $rootScope.currentLocale = $localStorage.country.LanguageCode || 'en';
    }

    $ionicPlatform.ready(function () {
        // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
        // for form inputs)
        if (window.cordova && window.cordova.plugins.Keyboard) {
            cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
        }
        if (window.StatusBar) {
            StatusBar.styleLightContent();
        }
        if (window.screen && window.screen.lockOrientation) {
            screen.lockOrientation('portrait');
        }


        if (window.nfc) {
            window.nfc.addNdefListener(function (event) {
                $timeout(function () {
                    $rootScope.$broadcast('nfc:foundTag', event.tag);
                });
            });

            window.nfc.addNdefFormatableListener(function (e, tag) {
                console.log('Formatable found');
                var message = [
                    window.ndef.record(window.ndef.TNF_EXTERNAL_TYPE,
                        util.stringToBytes('application/talon'),
                        util.stringToBytes(forge.util.bytesToHex(forge.random.getBytes(16))),
                        util.stringToBytes('')
                    )
                ];

                window.nfc.write(message);
            });
        }

    });
})


.config(function ($stateProvider, $urlRouterProvider, $httpProvider) {
    $httpProvider.interceptors.push('authInterceptor');


    $stateProvider

        .state('app', {
        url: '/app',
        abstract: true,
        templateUrl: 'templates/menu.html'
    })

    .state('app.pos', {
        url: '/pos',
        views: {
            'menuContent': {
                templateUrl: 'templates/pos.html'
            }
        }
    })

    .state('app.beneficiary', {
        url: '/beneficiary',
        views: {
            'menuContent': {
                templateUrl: 'templates/list-beneficiaries.html'
            }
        }
    })

    .state('app.view-beneficiary', {
        url: '/view-beneficiary/:id',
        views: {
            'menuContent': {
                templateUrl: 'templates/view-beneficiary.html'
            }
        }
    })

    .state('app.receipts', {
        url: '/receipts',
        views: {
            'menuContent': {
                templateUrl: 'templates/blank.html'
            }
        }
    })

    .state('app.invoices', {
        url: '/invoices',
        views: {
            'menuContent': {
                templateUrl: 'templates/blank.html'
            }
        }
    })

    .state('app.sync', {
        url: '/sync',
        views: {
            'menuContent': {
                templateUrl: 'templates/sync.html'
            }
        }
    })

    .state('app.settings', {
        url: '/settings',
        views: {
            'menuContent': {
                templateUrl: 'templates/settings.html'
            }
        }
    })

    // if none of the above states are matched, use this as the fallback
    $urlRouterProvider.otherwise('/app/pos');
})

;
