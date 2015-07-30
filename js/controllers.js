/* global window */

angular.module('talon.controllers', [
        'ngStorage',
        'talon.templates',
        'talon.auth',
        'talon.beneficiary',
        'talon.common',
        'talon.nfc',
        'talon.transaction',
        'ngCordova'
    ])
    .controller('AppController', function AppController($scope, beneficiaryData, $timeout, $rootScope, $cordovaGeolocation,
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

        $ionicPlatform.ready(function () {
            var posOptions = {
                timeout: 10000,
                enableHighAccuracy: false
            };
            $cordovaGeolocation
                .getCurrentPosition(posOptions)
                .then(function (position) {
                    $rootScope.currentLocation = position.coords;
                }, function (err) {
                    // error
                });

        })

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
    .controller('SettingsController', function SettingsController($scope, $localStorage, $rootScope, $nfcTools) {
        $scope.country = $rootScope.country;
        $scope.logout = logout;
        $scope.updateCountry = updateCountry;
        $scope.checkDeviceStatus = function () {
            $nfcTools.acr35GetDeviceStatus().then(function () {
                $nfcTools.acr35GetDeviceId().then(function () {});
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


;
