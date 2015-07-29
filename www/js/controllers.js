angular.module('talon.controllers', [
        'ngStorage',
        'talon.services',
        'ngCordova'
    ])
    .controller('AppController', function AppController($scope, beneficiaryData, $timeout, $rootScope,
        $ionicPlatform, $nfcTools, $localStorage, $ionicModal, $q, $cordovaSpinnerDialog, adminAuthentication) {
        $scope.pin = $scope.$new();
        $scope.login = $scope.$new();

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
    .controller('SettingsController', function SettingsController($scope, $localStorage, $rootScope) {
        $scope.country = $rootScope.country;
        $scope.logout = logout;
        $scope.updateCountry = updateCountry;

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
                beneficiaryData.reloadCard(pin).then(function() {
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
