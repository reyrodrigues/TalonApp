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

angular.module('talon.constants', [])
 .constant('talonRoot', 'http://74ced177.ngrok.io/');

angular.module('talon.controllers', [
        'ngStorage',
        'talon.services',
        'ngCordova'
    ])
    .controller('AppController', function AppController($scope, beneficiaryData, $timeout, $rootScope,
        $ionicPlatform, $nfcTools, $localStorage, $ionicModal, $q, $cordovaSpinnerDialog, adminAuthentication, $nfcTools) {
        $scope.pin = $scope.$new();
        $scope.login = $scope.$new();
        $rootScope.device = {};

        $ionicModal.fromTemplateUrl('templates/login.html', {
            scope: $scope.login,
            focusFirstInput: true,
            backdropClickToClose: false,
            hardwareBackButtonClose: false
        }).then(function (modal) {
            $scope.login.modal = modal;
        });

        $ionicModal.fromTemplateUrl('templates/pin-code.html', {
            scope: $scope.pin
        }).then(function (modal) {
            $scope.pin.modal = modal;
        });

        $ionicPlatform.ready(loadDeviceInfo);
        $rootScope.$on('onResumeCordova', loadDeviceInfo);


        if (!$localStorage.authorizationData) {
            $scope.login.$watch('modal', function () {
                if ($scope.login.modal) {
                    showLoginModal().then(function () {});
                }
            });
        } else {
            $rootScope.authorizationData = $localStorage.authorizationData;
            if ($localStorage.authorizationData.tokenType == 2 && !$rootScope.currentUser) {
                adminAuthentication.loadUserData();
            }
        }
        $scope.readIdIso = function () {
            if (window.nfcTools) {
                window.nfcTools.isoDepReadIdFromTag(function () {
                    console.log('success');
                }, function () {
                    console.log('Error');
                })
            }
        };

        $scope.setupVendor = function () {
            beneficiaryData.loadKeys().then(function (keys) {
                beneficiaryData.loadCardLoads().then(function (cardLoad) {

                });
            });
        };
        $scope.provisionCard = function () {
            var beneficiaryId = prompt('beneficiaryId');

            beneficiaryData.provisionBeneficiary(beneficiaryId).then(function () {});
        };

        $scope.loadCard = function () {
            showPinModal().then(function (pin) {
                beneficiaryData.fetchBeneficiary().then(function (beneficiary) {
                    beneficiaryData.fetchCardLoad(beneficiary.BeneficiaryId, beneficiary.CardKey, pin).then(function (data) {
                        if (data) {
                            var payload = '1933|' + data[0] + '|' + data[1].toString(16);
                            $timeout(function () {
                                beneficiaryData.updateCard(payload, beneficiary.CardKey, pin).then(function (update) {});
                            }, 1000);
                        }
                    })
                });
            });
        };

        $scope.readCard = function () {
            var afterTimeout = function (argument) {
                $cordovaSpinnerDialog.hide();
            };

            showPinModal().then(function (pin) {
                $cordovaSpinnerDialog.show('Read Card', 'Please hold NFC card close to reader', true);
                beneficiaryData.fetchBeneficiary().then(function (beneficiary) {
                    beneficiaryData.readCard(beneficiary.CardKey, pin).then(function (info) {
                        $scope.cardInfo = info;

                        $cordovaSpinnerDialog.hide();
                    }).catch(afterTimeout);
                }).catch(afterTimeout);
            }).catch(afterTimeout);
        };

        $scope.showPinModal = showPinModal;
        $scope.showLoginModal = showLoginModal;

        function loadDeviceInfo() {

            $nfcTools.acr35GetDeviceStatus().then(function (status) {
                $rootScope.device.batteryLevel = status[0];
                $rootScope.device.sleepTimeout = status[1];
                $nfcTools.acr35GetDeviceId().then(function (deviceId) {
                    $rootScope.device.deviceId = deviceId;
                });
            });
        }

        function showPinModal() {
            $scope.pin.deferred = $q.defer();
            $scope.pin.passcode = "";

            if ($scope.login.modal)
                $scope.pin.modal.show();

            return $scope.pin.deferred.promise;
        }

        function showLoginModal() {
            $scope.login.deferred = $q.defer();

            delete $localStorage.authorizationData;
            delete $rootScope.authorizationData;

            delete $localStorage.currentUser;
            delete $rootScope.currentUser;

            delete $localStorage.organization;
            delete $rootScope.organization;

            delete $localStorage.country;
            delete $rootScope.country;

            if ($scope.login.modal)
                $scope.login.modal.show();

            return $scope.login.deferred.promise;
        }
    })
    .controller('PinController', function PinController($scope, $location, $timeout) {
        $scope.cancel = function () {
            $scope.passcode = "";
            $scope.modal.hide();
            $scope.deferred.reject();
        }

        $scope.add = function (value) {
            if ($scope.passcode.length < 4) {
                $scope.passcode = $scope.passcode + value;
                if ($scope.passcode.length == 4) {
                    $timeout(function () {
                        $scope.deferred.resolve($scope.passcode);
                        $scope.modal.hide();
                        $timeout(function () {
                            $scope.passcode = "";
                        }, 100);
                    }, 0);
                }
            }
        }

        $scope.delete = function () {
            if ($scope.passcode.length > 0) {
                $scope.passcode = $scope.passcode.substring(0, $scope.passcode.length - 1);
            }
        }
    })
    .controller('POSController', function POSController($scope, $ionicModal, $q, beneficiaryData,
        $cordovaSpinnerDialog, $timeout) {

        $scope.decimalChar = '.';
        $scope.value = '';

        $scope.clear = function () {
            $scope.value = '';
        };

        $scope.delete = function () {
            var string = $scope.value.toString(10);
            $scope.value = string.substring(0, string.length - 1);
        };

        $scope.addDigit = function (digit) {
            if (digit != $scope.decimalChar || $scope.value.indexOf($scope.decimalChar) == -1)
                $scope.value = $scope.value + digit;
        };

        $scope.process = function () {
            var afterTimeout = function (argument) {
                $cordovaSpinnerDialog.hide();
                $scope.clear();
            };

            $scope.showPinModal().then(function (pin) {
                $cordovaSpinnerDialog.show('Read Card', 'Please hold NFC card close to reader', true);
                beneficiaryData.fetchBeneficiary().then(function (beneficiary) {
                    beneficiaryData.readCard(beneficiary.CardKey, pin).then(function (info) {
                        var value = info[0] - parseFloat($scope.value, 10);
                        if (value > 0) {
                            var payload = '1933|' + value + '|' + info[1].toString(16);
                            $timeout(function () {
                                beneficiaryData.updateCard(payload, beneficiary.CardKey, pin).then(function (update) {
                                    $cordovaSpinnerDialog.hide();
                                    $scope.clear();
                                });
                            }, 1000);
                        }
                    }).catch(afterTimeout);
                }).catch(afterTimeout);
            }).catch(afterTimeout);
        };

        function ParseNumber() {
            $scope.number = $scope.value;
        }
    })
    .controller('LoginController', function LoginController($scope, $rootScope, $localStorage, vendorAuthentication, adminAuthentication) {
        $scope.loginData = {};
        $scope.wrongPassword = false;

        $scope.loginAdmin = function LoginAdmin() {
            adminAuthentication.login($scope.loginData.username, $scope.loginData.password).then(function () {
                    $rootScope.authorizationData = $localStorage.authorizationData;
                    adminAuthentication.loadUserData().then(function () {
                        $scope.deferred.resolve();
                        $scope.modal.hide();
                        $scope.wrongPassword = false;
                        $scope.loginData = {};
                    });
                })
                .catch(function () {
                    $scope.wrongPassword = true;
                });
        };

        $scope.loginVendor = function LoginVendor() {
            vendorAuthentication.login($scope.loginData.username, $scope.loginData.password).then(function () {
                    $scope.deferred.resolve();
                    $scope.modal.hide();
                    $scope.wrongPassword = false;
                    $scope.loginData = {};
                    $rootScope.authorizationData = $localStorage.authorizationData;
                })
                .catch(function () {
                    $scope.wrongPassword = true;
                });
        }
    })
    .controller('SettingsController', function SettingsController($scope, $localStorage, $rootScope, $nfcTools) {
        $scope.country = $rootScope.country;
        $scope.logout = logout;
        $scope.updateCountry = updateCountry;
        $scope.checkDeviceStatus = function () {
            $nfcTools.acr35GetDeviceStatus().then(function () {
                console.log(arguments);

                $nfcTools.acr35GetDeviceId().then(function () {
                    console.log(arguments);
                });
            });
        }

        function updateCountry(country) {
            $localStorage.country = country;
            console.log(country);
        }

        function logout() {
            delete $localStorage.authorizationData;
            $scope.showLoginModal();
        }
    })
    .controller('BeneficiaryController', function BeneficiaryController($scope, $localStorage, $ionicModal, $cordovaSpinnerDialog, beneficiaryData) {
        $scope.reloadCard = reloadCard;
        $scope.readCard = readCard;

        function reloadCard() {
            var afterTimeout = function (argument) {
                console.log(arguments);
                $cordovaSpinnerDialog.hide();
            };

            $scope.showPinModal().then(function (pin) {
                $cordovaSpinnerDialog.show('Read Card', 'Please hold NFC card close to reader', true);
                beneficiaryData.reloadCard(pin).then(function () {
                    $cordovaSpinnerDialog.hide();
                }).catch(afterTimeout);
            }).catch(afterTimeout);
        }


        function readCard() {
            var afterTimeout = function (argument) {
                $cordovaSpinnerDialog.hide();
            };

            $scope.showPinModal().then(function (pin) {
                $cordovaSpinnerDialog.show('Read Card', 'Please hold NFC card close to reader', true);
                beneficiaryData.fetchBeneficiary().then(function (beneficiary) {
                    beneficiaryData.readCard(beneficiary.CardKey, pin).then(function (info) {
                        $scope.cardInfo = info;
                        console.log(info);

                        $cordovaSpinnerDialog.hide();
                    }).catch(afterTimeout);
                }).catch(afterTimeout);
            }).catch(afterTimeout);
        }

    })
    .controller('ListBeneficiaryController', function ListBeneficiaryController($scope, $localStorage, $q, $timeout, $http, talonRoot) {
        $scope.beneficiaries = [];
        $scope.provisionCard = ProvisionCard;
        $scope.getBeneficiariesByName = getBeneficiariesByName;

        var timeout = null;

        function getBeneficiariesByName(name) {
            if (timeout) {
                $timeout.cancel(timeout);
            }

            timeout = $timeout(function () {
                var filter = '$filter=startswith(tolower(FirstName), \'' + encodeURIComponent(name.toLowerCase()) + '\') or ' + 'startswith(tolower(LastName), \'' + encodeURIComponent(name.toLowerCase()) + '\')';

                $http.get(talonRoot + 'Breeze/EVM/Beneficiaries?' + filter).then(function (res) {
                    $scope.beneficiaries = res.data;
                });
                timeout = null;
            }, 500);

            return timeout;
        }

        function ProvisionCard() {
            var beneficiaryId = prompt('beneficiaryId');

            beneficiaryData.provisionBeneficiary(beneficiaryId).then(function () {});
        };
    })
    .controller('ViewBeneficiaryController', function ViewBeneficiaryController($scope, $localStorage, $q, $timeout, $http, $state, talonRoot, beneficiaryData) {
        $scope.provisionCard = function () {
            var beneficiaryId = $scope.beneficiary.Id;

            beneficiaryData.provisionBeneficiary(beneficiaryId).then(function () {});
        };

        $http.get(talonRoot + 'Breeze/EVM/Beneficiaries?$expand=Location&$filter=Id eq ' + $state.params.id + '').then(function (res) {
            $scope.beneficiary = res.data[0];
        });
    })
    .controller('SyncController', function SyncController($scope, $localStorage, beneficiaryData) {

        $scope.setupVendor = function () {
            beneficiaryData.sync();
        };
    });

angular.module('talon.directives', [])

.directive('ionSearch', function() {
        return {
            restrict: 'E',
            replace: true,
            scope: {
                getData: '&source',
                model: '=?',
                search: '=?filter'
            },
            link: function(scope, element, attrs) {
                attrs.minLength = attrs.minLength || 0;
                scope.placeholder = attrs.placeholder || '';
                scope.search = {value: ''};

                if (attrs.class)
                    element.addClass(attrs.class);

                if (attrs.source) {
                    scope.$watch('search.value', function (newValue, oldValue) {
                        if (newValue.length > attrs.minLength) {
                            scope.getData({str: newValue}).then(function (results) {
                                scope.model = results;
                            });
                        } else {
                            scope.model = [];
                        }
                    });
                }

                scope.clearSearch = function() {
                    scope.search.value = '';
                };
            },
            template: '<div class="item-input-wrapper">' +
                        '<i class="icon ion-android-search"></i>' +
                        '<input type="search" placeholder="{{placeholder}}" ng-model="search.value">' +
                        '<i ng-if="search.value.length > 0" ng-click="clearSearch()" class="icon ion-close"></i>' +
                      '</div>'
        };
    })


    ;

angular
    .module('talon.factories', [
        'ngStorage',
        'ngCordova',
        'talon.services'
    ])

.factory('deviceIdIntereceptor', ['$q', '$injector', '$cordovaDevice', '$localStorage', function AuthInterceptor($q, $injector, $cordovaDevice, $localStorage) {
    // Adding the UUID to the requrests for authentication purposes
    // Token auth should be used as well

    var deviceIdIntereceptorFactory = {};

    var _request = function (config) {

        config.headers = config.headers || {};
        var uuid = window.device ? $cordovaDevice.getUUID() : "UNKNOWN";

        if (uuid) {
            config.headers.DevideUUID = uuid;
        }

        return config;
    };

    var _responseError = function (rejection) {
        return $q.reject(rejection);
    };

    deviceIdIntereceptorFactory.request = _request;
    deviceIdIntereceptorFactory.responseError = _responseError;

    return deviceIdIntereceptorFactory;
}])


.factory('authInterceptor', ['$q', '$injector', '$location', '$localStorage', function AuthInterceptor($q, $injector, $location, $localStorage, $rootScope) {

    var authInterceptorServiceFactory = {};

    var _request = function (config) {

        config.headers = config.headers || {};

        var authData = $localStorage.authorizationData;
        if (authData) {
            config.headers.Authorization = ($localStorage.authorizationData.tokenType == 1 ? 'Token ' : 'Bearer ') + authData.token;
        }
        if ($localStorage.currentUser) {
            if ($localStorage.authorizationData && $localStorage.authorizationData.tokenType == 2) {
                if ($localStorage.currentUser.Organization) {
                    var organizationId = $localStorage.currentUser.Organization.Id;
                    config.headers['X-Tenant-Organization'] = organizationId;

                }
            }

            if ($localStorage.authorizationData && $localStorage.authorizationData.tokenType == 1) {
                var vendorId = $localStorage.currentUser.Id;
            }


            if ($localStorage.country) {
                var countryId = $localStorage.country.Id;
                config.headers['X-Tenant-Country'] = countryId;
            }

        }

        return config;
    };

    var _responseError = function (rejection) {
        if (rejection.status === 401) {
        }
        return $q.reject(rejection);
    };

    authInterceptorServiceFactory.request = _request;
    authInterceptorServiceFactory.responseError = _responseError;

    return authInterceptorServiceFactory;
}]);

angular.module('talon.services', [
        'ngStorage',
        'talon.constants',
        'pouchdb'
    ])
    .service('beneficiaryData', function beneficiaryData($http, $localStorage, pouchDB, pouchDBDecorators, $q, talonRoot,
        $nfcTools, $ionicPlatform, $timeout, $cordovaFile, $cordovaFileTransfer) {
        var keyDB = pouchDB('keyStore', {
            adapter: 'websql'
        });

        var cardLoadDB = pouchDB('cardLoadStore', {
            adapter: 'websql'
        });

        var cardLoadHistoryDB = pouchDB('cardLoadHistoryStore', {
            adapter: 'websql'
        });

        var transactionHistoryDB = pouchDB('transactionHistoryStore', {
            adapter: 'websql'
        });


        keyDB.createIndex({
            index: {
                fields: ['CardId']
            }
        });
        keyDB.createIndex({
            index: {
                fields: ['BeneficiaryId']
            }
        });

        cardLoadDB.createIndex({
            index: {
                fields: ['CardId']
            }
        });


        updatePouchDB(keyDB);
        updatePouchDB(cardLoadDB);
        updatePouchDB(transactionHistoryDB);
        updatePouchDB(cardLoadHistoryDB);

        return {
            reloadCard: ReloadCard,

            loadKeys: LoadKeys,
            loadCardLoads: LoadCardLoads,

            sync: Sync,

            updateCard: UpdateCard,
            readCard: ReadCard,

            provisionBeneficiary: ProvisionBeneficiary,
            fetchBeneficiary: FetchBeneficiary
        };

        function Sync() {
            var def = $q.defer();
            CheckConnectivity().then(function () {
                LoadKeys().then(function () {
                    LoadCardLoads().then(function () {
                        $http.get(talonRoot + 'api/App/MobileClient/DownloadKeyset')
                            .then(function (keyset) {
                                $localStorage.keyset = keyset.data;
                                def.resolve();

                            })
                            .catch(def.resolve.bind(def));
                    });
                });
            }).catch(function () {
                LoadPayloadFromNetwork().then(def.resolve.bind(def));
            })

            def.promise
        }

        function FetchBeneficiary() {
            var def = $q.defer();
            $ionicPlatform.ready(function () {
                $nfcTools.acr35ReadIdFromTag().then(function (result) {
                    var id = result[0];
                    keyDB.find({
                        selector: {
                            CardId: id
                        }
                    }).then(function (s) {
                        if (s.docs.length) {
                            def.resolve(s.docs[0]);
                        }
                        def.reject();
                    });
                });
            });

            return def.promise;
        }

        function ProvisionBeneficiary(beneficiaryId, pin) {
            var def = $q.defer();

            $ionicPlatform.ready(function () {
                $nfcTools.acr35ReadIdFromTag().then(function (result) {
                    var id = result[0];
                    $http.post(talonRoot + 'api/App/MobileClient/ProvisionBeneficiary', {
                        'beneficiaryId': beneficiaryId,
                        'cardId': id
                    }).then(function (k) {
                        var key = k.data;

                        keyDB.upsert(key._id, function (d) {
                            return {
                                BeneficiaryId: key.BeneficiaryId,
                                CardId: key.CardId,
                                CardKey: key.CardKey
                            };
                        });

                        $http.get(talonRoot + 'api/App/MobileClient/GenerateInitialLoad?beneficiaryId=' + key.BeneficiaryId).then(function (res) {
                            var payload = res.data;
                            payload = forge.util.createBuffer(forge.util.decode64(payload), 'raw').toHex();
                            $nfcTools.acr35WriteDataIntoTag(payload).then(function (result) {
                                def.resolve();
                            });
                        });
                    });
                }).catch(function () {
                    def.reject();
                });
            });

            return def.promise
        }

        // Reload Card
        function ReloadCard(pin) {
            var def = $q.defer();
            FetchBeneficiary().then(function (beneficiary) {
                ReadCard(beneficiary.CardKey, pin).then(function (cardInfo) {
                    cardLoadDB.find({
                        selector: {
                            CardId: beneficiary.CardId
                        }
                    }).then(function (res) {
                        var loads = res.docs[0].Load;

                        var data = loads.map(function (d) {
                            var encryptedData = forge.util.decode64(d);
                            var decrypted = decrypt(encryptedData, pin, beneficiary.CardKey);
                            if (!decrypted)
                                throw new Error();

                            var values = decrypted.split('|');
                            return [parseFloat(values[1], 10), moment.unix(parseInt(values[2], 16))];
                        });

                        var since = moment.unix(cardInfo[1]);

                        var load = data
                            .filter(function (d) {
                                return d[1] > since;
                            })
                            .reduce(function (a, b) {
                                // Sum first item
                                // Get largest of the second
                                return [a[0] + b[0], a[1] > b[1] ? a[1] : b[1]];
                            }, [0, 0]);

                        var payload = '1933|' + (load[0] + cardInfo[0]) + '|' + load[1].unix().toString(16);
                        $timeout(function () {
                            UpdateCard(payload, beneficiary.CardKey, pin)
                                .then(function (update) {
                                    def.resolve();
                                }).catch(def.reject.bind(def));
                        }, 500);
                    }).catch(def.reject.bind(def));
                }).catch(def.reject.bind(def));
            }).catch(def.reject.bind(def));

            return def.promise;
        }

        function CheckConnectivity() {
            var def = $q.defer();
            $http.get(talonRoot + 'api/App/MobileClient/IsAlive').then(function (r) {
                if (r.status !== 200) {
                    def.reject();
                } else {
                    def.resolve();
                }
            }).catch(def.reject.bind(def));

            return def.promise;
        }


        function LoadPayloadFromNetwork() {
            var def = $q.defer();

            $ionicPlatform.ready(function () {
                var uri = encodeURI("http://10.10.10.254/data/UsbDisk1/Volume1/Talon/" + $localStorage.country.IsoAlpha3 + ".zip");

                var localDirUri = cordova.file.tempDirectory || cordova.file.cacheDirectory;
                var logError = function (error) {
                    console.log(error);
                    def.reject();
                }

                $cordovaFile.createFile(localDirUri, 'load.zip', true).then(function (fileEntry) {
                    $cordovaFileTransfer.download(uri, fileEntry.toURL())
                        .then(function (entry) {
                            $cordovaFile.readAsArrayBuffer(localDirUri, 'load.zip').then(function (file) {
                                var zip = new JSZip(file);
                                var cardLoads = decryptRsaData(zip.file("CardLoads.b64").asText());
                                var beneficiaryKeys = decryptRsaData(zip.file("BeneficiaryKeys.b64").asText());

                                LoadCardLoadsInternal(JSON.parse(cardLoads)).then(function () {
                                    LoadKeysInternal(JSON.parse(beneficiaryKeys)).then(function () {
                                        $cordovaFile.removeFile(localDirUri, 'load.zip').then(function () {
                                            console.log('Loaded from wifi storage');

                                            def.resolve();
                                        }).catch(logError)
                                    }).catch(logError);
                                }).catch(logError);
                            }).catch(logError);
                        }).catch(logError);
                }).catch(logError)
            });


            return def.promise;
        }

        // Key Data
        function LoadKeys() {
            console.log('Internet');

            return $http.get(talonRoot + 'api/App/MobileClient/DownloadBeneficiaryKeys').then(function (k) {
                return LoadKeysInternal(k.data);
            });
        }

        function LoadKeysInternal(data) {
            return $q.all(data.map(function (key) {
                return keyDB.upsert(key._id, function (d) {
                    return {
                        BeneficiaryId: key.BeneficiaryId,
                        CardId: key.CardId,
                        CardKey: key.CardKey
                    };
                }).then(function () {
                    return key;
                });
            }));
        }

        // Card Load
        function LoadCardLoads() {
            console.log('Internet');
            return $http.get(talonRoot + 'api/App/MobileClient/GenerateCardLoads')
                .then(function (r) {
                    return LoadCardLoadsInternal(r.data);
                });
        }

        function LoadCardLoadsInternal(data) {
            return $q.all(data.map(function (load) {
                return cardLoadDB.upsert(load._id, function (d) {
                    return {
                        CardId: load.CardId,
                        Load: load.Load
                    };
                }).then(function () {
                    return load;
                });
            }));
        }


        function ReadCard(key, pin) {
            var def = $q.defer();
            $ionicPlatform.ready(function () {
                $nfcTools.acr35ReadDataFromTag().then(function (result) {
                    var firstIndex = result[0].indexOf('0000');
                    if (firstIndex % 2 == 1)
                        firstIndex += 1;

                    var dataToZero = result[0].substring(0, firstIndex);
                    var encryptedData = forge.util.hexToBytes(dataToZero);
                    var decrypted = decrypt(encryptedData, pin, key);

                    if (!decrypted)
                        def.reject();

                    var values = decrypted.split('|');
                    var currentCard = [parseFloat(values[1], 10), moment.unix(parseInt(values[2], 16)).unix()];

                    def.resolve(currentCard);
                });
            });

            return def.promise;
        }

        function UpdateCard(data, key, pin) {
            var encrypted = forge.util.createBuffer(forge.util.decode64(encrypt(data, pin, key)), 'raw').toHex();
            var def = $q.defer();
            $ionicPlatform.ready(function () {
                $nfcTools.acr35WriteDataIntoTag(encrypted).then(function (result) {
                    def.resolve(result);
                });
            });

            return def.promise;
        }

        function updatePouchDB(db) {
            // Update plugin methods to use $q

            db.find = pouchDBDecorators.qify(db.find);
            db.upsert = pouchDBDecorators.qify(db.upsert);
            db.putIfNotExists = pouchDBDecorators.qify(db.putIfNotExists);
            db.createIndex = pouchDBDecorators.qify(db.createIndex);
        }

        function encrypt(data, pin, key) {
            var cipher = forge.cipher.createCipher('AES-CBC', forge.util.createBuffer(forge.util.decode64(key), 'raw'));
            cipher.start({
                iv: forge.util.createBuffer(pin, 'utf8')
            });
            cipher.update(forge.util.createBuffer(forge.util.createBuffer(data, 'utf8')));
            cipher.finish();
            var encrypted = cipher.output;
            return forge.util.encode64(encrypted.bytes());
        }

        function decrypt(data, pin, key) {
            var decipher = forge.cipher.createDecipher('AES-CBC', forge.util.createBuffer(forge.util.decode64(key), 'raw'));
            decipher.start({
                iv: forge.util.createBuffer(pin, 'utf8')
            });
            decipher.update(forge.util.createBuffer(data, 'raw'));
            decipher.finish();
            if (decipher.output.toHex().indexOf('31393333') == 0) {
                return decipher.output.toString();
            } else {
                return null;
            }
        }

        function decryptRsaData(data) {
            // The vendor has their own private key
            var keyPEM = $localStorage.keyset.Vendor;
            var privateKey = forge.pki.privateKeyFromPem(keyPEM);

            // the data is AES-CBC encrypted but the key and IV are RSA'd
            var payload = data.split('|');
            var key = privateKey.decrypt(forge.util.decode64(payload[1]), 'RSA-OAEP');
            var iv = privateKey.decrypt(forge.util.decode64(payload[2]), 'RSA-OAEP');

            var decipher = forge.cipher.createDecipher('AES-CBC', forge.util.createBuffer(key, 'raw'));
            decipher.start({
                iv: forge.util.createBuffer(iv, 'raw')
            });
            decipher.update(forge.util.createBuffer(forge.util.decode64(payload[0]), 'raw'));

            if (decipher.finish()) {
                return decipher.output.toString();
            } else {
                return null;
            }
        }

        function encryptRsaData(data) {
            var key = forge.random.getBytesSync(16);
            var iv = forge.random.getBytesSync(16);
            var bytes = forge.util.createBuffer(data, 'utf8');

            var keyPEM = $localStorage.keyset.Server;
            var privateKey = forge.pki.publicKeyFromPem(keyPEM);

            var cipher = forge.cipher.createCipher('AES-CBC', key);

            cipher.start({
                iv: iv
            });
            cipher.update(forge.util.createBuffer(bytes));
            cipher.finish();
            var encrypted = forge.util.encode64(forge.util.hexToBytes(cipher.output.toHex()));
            var result = [
                encrypted,
                forge.util.encode64(privateKey.encrypt(key, 'RSA-OAEP')),
                forge.util.encode64(privateKey.encrypt(iv, 'RSA-OAEP'))
            ]

            return result.join('|');
        }
    })
    .service('$nfcTools', function ($timeout, $q) {

        function makePromise(fn, args, async) {
            var deferred = $q.defer();

            var success = function (response) {
                if (async) {
                    $timeout(function () {
                        deferred.resolve(response);
                    });
                } else {
                    deferred.resolve(response);
                }
            };

            var fail = function (response) {
                if (async) {
                    $timeout(function () {
                        deferred.reject(response);
                    });
                } else {
                    deferred.reject(response);
                }
            };

            args.push(success);
            args.push(fail);

            fn.apply(window.nfcTools, args);

            return deferred.promise;
        }

        var nfcTools = {
            acr35WriteDataIntoTag: function (data) {
                return makePromise(window.nfcTools.acr35WriteDataIntoTag, [data], true);
            },
            acr35ReadDataFromTag: function () {
                return makePromise(window.nfcTools.acr35ReadDataFromTag, [], true);
            },
            acr35ReadIdFromTag: function () {
                return makePromise(window.nfcTools.acr35ReadIdFromTag, [], true);
            },
            acr35GetDeviceStatus: function () {
                return makePromise(window.nfcTools.acr35GetDeviceStatus, [], true);
            },
            acr35GetDeviceId: function () {
                return makePromise(window.nfcTools.acr35GetDeviceId, [], true);
            },
            isoDepReadIdFromTag: function () {
                return makePromise(window.nfcTools.isoDepReadIdFromTag, [], true);
            }
        };

        return nfcTools;
    })
    .service('vendorAuthentication', function ($http, $q, talonRoot, $cordovaDevice, $localStorage, $rootScope) {
        var vendorAuthServiceFactory = {
            login: login
        };

        return vendorAuthServiceFactory;

        function login(userName, password) {
            var device = {};
            if (window.device) {
                device = $cordovaDevice.getDevice();
            } else {
                device.uuid = '00:00:00:00';
            }

            var payload = {
                UserName: userName,
                Password: password,
                Device: device
            }

            var deferred = $q.defer();

            $http.post(talonRoot + 'api/App/VendorProfile/Login', payload)
                .then(function (response) {
                    if (response.status == 200) {
                        $localStorage.authorizationData = {
                            userName: payload.UserName,
                            token: response.data.token,
                            uuid: device.UUID || device.uuid,
                            tokenType: 1
                        };

                        loadVendorProfile(response.data.id).then(function () {
                            deferred.resolve($localStorage.authorizationData);
                        })
                    } else {
                        deferred.reject(response.data);
                    }
                })
                .catch(function (err, status) {
                    deferred.reject(err);
                })

            return deferred.promise;
        }

        function loadVendorProfile(vendorId) {
            var deferred = $q.defer();
            if ($localStorage.currentUser) {
                $rootScope.currentUser = $localStorage.currentUser;

                if (!$localStorage.country) {
                    $localStorage.country = $rootScope.currentUser.Country;
                }

                $rootScope.country = $localStorage.country;

                deferred.resolve();
            } else {
                $http.get(talonRoot + 'api/App/VendorProfile/LoadProfile')
                    .then(function (response) {
                        $rootScope.currentUser = response.data;
                        $localStorage.currentUser = response.data;

                        if (!$localStorage.country) {
                            $localStorage.country = $rootScope.currentUser.Country;
                        }

                        $rootScope.country = $localStorage.country;

                        deferred.resolve();
                    })
                    .catch(function () {
                        console.log(arguments);
                        deferred.reject(arguments);
                    });
            }

            return deferred.promise;
        }

    })
    .service('adminAuthentication', function AuthService($http, $localStorage, $q, $rootScope, talonRoot) {
        var serviceRoot = talonRoot;
        var device = {};
        if (window.device) {
            device = $cordovaDevice.getDevice();
        } else {
            device.uuid = '00:00:00:00';
        }

        return {
            login: login,
            logOut: logOut,
            loadUserData: loadUserData
        };

        function login(username, password) {
            var data = "grant_type=password&username=" + username + "&password=" + password;
            var deferred = $q.defer();

            $http.post(serviceRoot + 'token', data, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }).success(function (response) {
                $localStorage.authorizationData = {
                    token: response.access_token,
                    userName: username,
                    uuid: device.UUID || device.uuid,
                    tokenType: 2
                };
                deferred.resolve(true);
            }).error(function (err, status) {
                logOut();
                deferred.reject(false);
            });

            return deferred.promise;
        }

        function logOut() {}

        function loadUserData() {
            var deferred = $q.defer();
            if ($localStorage.currentUser) {
                $rootScope.currentUser = $localStorage.currentUser;
                $rootScope.organization = $rootScope.currentUser.Organization;
                var countries = $rootScope.currentUser.Countries.map(function (c) {
                    return c.Country;
                });

                if (!$localStorage.country) {
                    $localStorage.country = countries[0];
                }

                $rootScope.country = $localStorage.country;

                if ($rootScope.currentUser.Countries.length > 1) {
                    $rootScope.availableCountries = countries;
                } else {
                    $rootScope.availableCountries = false;
                }
                deferred.resolve();
            } else {

                $http.get(serviceRoot + 'api/Account/Me')
                    .then(function (response) {
                        $rootScope.currentUser = response.data;
                        $localStorage.currentUser = response.data;

                        $rootScope.organization = $rootScope.currentUser.Organization;
                        $localStorage.organization = $rootScope.currentUser.Organization;
                        var countries = $rootScope.currentUser.Countries.map(function (c) {
                            return c.Country;
                        });

                        if (!$localStorage.country) {
                            $localStorage.country = countries[0];
                        }

                        $rootScope.country = $localStorage.country;

                        if ($rootScope.currentUser.Countries.length > 1) {
                            $rootScope.availableCountries = countries;
                        } else {
                            $rootScope.availableCountries = false;
                        }
                        deferred.resolve();
                    })
                    .catch(function () {
                        console.log(arguments);
                        deferred.reject(arguments);
                    });
            }

            return deferred.promise;
        }
    })


//
/*
forge.rsa.setPrivateKey(
  forge.util.decode64(keys.Vendor.Modulus),
  forge.util.decode64(keys.Vendor.Exponent),
  forge.util.decode64(keys.Vendor.D),
  forge.util.decode64(keys.Vendor.P),
  forge.util.decode64(keys.Vendor.Q),
  forge.util.decode64(keys.Vendor.DP),
  forge.util.decode64(keys.Vendor.DQ),
  forge.util.decode64(keys.Vendor. InverseQ)
).decrypt

var rsa = forge.rsa;
var decode64 = forge.util.decode64;
var bytesToHex = forge.util.bytesToHex;
var BigInteger = forge.jsbn.BigInteger;

forge.rsa.setPrivateKey(
 new BigInteger(bytesToHex(decode64(keys.Vendor.Modulus))),
 new BigInteger(bytesToHex(decode64(keys.Vendor.Exponent))),
 new BigInteger(bytesToHex(decode64(keys.Vendor.D))),
 new BigInteger(bytesToHex(decode64(keys.Vendor.P))),
 new BigInteger(bytesToHex(decode64(keys.Vendor.Q))),
 new BigInteger(bytesToHex(decode64(keys.Vendor.DP))),
 new BigInteger(bytesToHex(decode64(keys.Vendor.DQ))),
  new BigInteger(bytesToHex(decode64(keys.Vendor.InverseQ)))
)
.decrypt(decode64('yaJKEKWBeZYOlyb5KK2qGqlhWbobq6tIhjpa0bj3qXcElNsoadak88THPoYBVP7gASg0tITEhQSPE55p4GpbQbZqcmmtfCrM0JFdlG3kjbeAqLeHO0QKaN0LOgiZkXY+T86gPdMkE8YHbdGSU+JT5+b8ru22wdNYTDFv5u1iZsQ='), 'RSA-OAEP')

*/
;
