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
    .controller('AppController', function AppController($scope, beneficiaryData, $timeout, $rootScope,
        $cordovaGeolocation, $ionicPlatform, $nfcTools, $localStorage, $ionicModal, $q,
        $cordovaSpinnerDialog, adminAuthentication, $nfcTools, $settings, $interval) {
        $scope.pin = $scope.$new();
        $scope.login = $scope.$new();
        $scope.confirmation = $scope.$new();
        $scope.qrConfirmation = $scope.$new();
        $scope.signature = $scope.$new();
        $rootScope.device = {};

        $ionicModal.fromTemplateUrl('templates/login.html', {
            scope: $scope.login,
            focusFirstInput: true,
            backdropClickToClose: false,
            hardwareBackButtonClose: false
        }).then(function (modal) {
            $scope.login.modal = modal;
        });

        $ionicModal.fromTemplateUrl('templates/confirmation.html', {
            scope: $scope.confirmation,
            backdropClickToClose: false
        }).then(function (modal) {
            $scope.confirmation.modal = modal;
        });

        $ionicModal.fromTemplateUrl('templates/qr-confirmation.html', {
            scope: $scope.qrConfirmation,
            backdropClickToClose: false
        }).then(function (modal) {
            $scope.qrConfirmation.modal = modal;
        });

        $ionicModal.fromTemplateUrl('templates/pin-code.html', {
            scope: $scope.pin
        }).then(function (modal) {
            $scope.pin.modal = modal;
        });

        $ionicModal.fromTemplateUrl('templates/signature-pad.html', {
            scope: $scope.signature
        }).then(function (modal) {
            $scope.signature.modal = modal;
            $scope.signature.isOpen = false;
        });


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



        $ionicPlatform.ready(loadDeviceInfo);
        $rootScope.$on('onResumeCordova', loadDeviceInfo);
        $ionicPlatform.on('resume', function () {
            $rootScope.currentUser = $localStorage.currentUser;
            $rootScope.organization = $localStorage.currentUser.Organization;
            $rootScope.country = $localStorage.country;
            $rootScope.currentLocale = $localStorage.country.LanguageCode || 'en';
        });

        $ionicPlatform.ready(function () {
            var posOptions = {
                timeout: 10000,
                enableHighAccuracy: false
            };
            $cordovaGeolocation
                .getCurrentPosition(posOptions)
                .then(function (position) {
                    $rootScope.currentLocation = position.coords;
                }, function (err) {});
        });

        $scope.showPinModal = showPinModal;
        $scope.showLoginModal = showLoginModal;
        $scope.showConfirmationModal = showConfirmationModal;
        $scope.showSignaturePad = showSignaturePad;
        $scope.showQRConfirmationModal = showQRConfirmationModal;

        $interval(function () {
            $settings.sync();

        }, 12e4);

        function loadDeviceInfo() {

            /*
                        $nfcTools.acr35GetDeviceStatus().then(function (status) {
                            $rootScope.device.batteryLevel = status[0];
                            $rootScope.device.sleepTimeout = status[1];
                            $nfcTools.acr35GetDeviceId().then(function (deviceId) {
                                $rootScope.device.deviceId = deviceId;
                            });
                        });*/
        }


        function showPinModal() {
            $scope.pin.deferred = $q.defer();
            $scope.pin.passcode = "";

            if ($scope.login.modal)
                $scope.pin.modal.show();

            return $scope.pin.deferred.promise;
        }

        function showConfirmationModal(data, pin) {
            $scope.confirmation.deferred = $q.defer();
            $scope.confirmation.data = data;
            $scope.confirmation.pin = pin;

            if ($scope.confirmation.modal) {
                $scope.confirmation.modal.show();

            }

            return $scope.confirmation.deferred.promise;
        }

        function showQRConfirmationModal(voucher, pin) {
            $scope.qrConfirmation.deferred = $q.defer();
            $scope.qrConfirmation.vouchers = [voucher];
            $scope.qrConfirmation.pin = pin;

            if ($scope.qrConfirmation.modal) {
                $scope.qrConfirmation.modal.show();

            }

            return $scope.qrConfirmation.deferred.promise;
        }

        function showSignaturePad() {
            $scope.signature.deferred = $q.defer();

            if (window.screen && screen.lockOrientation) {
                screen.lockOrientation('landscape');
            }

            if ($scope.signature.modal) {
                $scope.signature.modal.show();
                $scope.signature.isOpen = true;
            }

            return $scope.signature.deferred.promise;
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


;
