// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
angular.module('talon', ['ionic', 'talon.services', 'talon.constants', 'talon.controllers', 'talon.factories', 'talon.directives'])

.run(function ($ionicPlatform) {
    $ionicPlatform.ready(function () {
        // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
        // for form inputs)
        if (window.cordova && window.cordova.plugins.Keyboard) {
            cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
        }
        if (window.StatusBar) {
            StatusBar.styleLightContent();
        }
    });
})


.config(function ($stateProvider, $urlRouterProvider, $httpProvider) {
    $httpProvider.interceptors.push('authInterceptor');
    $httpProvider.interceptors.push('deviceIdIntereceptor');


    $stateProvider

        .state('app', {
        url: '/app',
        abstract: true,
        templateUrl: 'templates/menu.html',
        controller: 'AppController'
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
                templateUrl: 'templates/beneficiary.html'
            }
        }
    })

    .state('app.list-beneficiaries', {
            url: '/list-beneficiaries',
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
