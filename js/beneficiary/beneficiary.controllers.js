angular.module('talon.beneficiary')
    .controller('BeneficiaryController', function BeneficiaryController($scope, $localStorage, $ionicModal, $cordovaSpinnerDialog, beneficiaryData) {
        $scope.reloadCard = reloadCard;
        $scope.readCard = readCard;

        function reloadCard() {
            var failFunction = function (error) {
                console.log(error);
                $cordovaSpinnerDialog.hide();
            };

            $scope.showPinModal().then(function (pin) {
                $cordovaSpinnerDialog.show('Reload Card', 'Please hold NFC card close to reader', true);
                beneficiaryData.reloadCard(pin).then(function () {
                    $cordovaSpinnerDialog.hide();
                }).catch(failFunction);
            }).catch(failFunction);
        }


        function readCard() {
            var failFunction = function (error) {
                console.log(error);
                $cordovaSpinnerDialog.hide();
            };
            $cordovaSpinnerDialog.show('Read Card', 'Please hold NFC card close to reader', true);
            beneficiaryData.readRawCardData().then(function (data) {
                $scope.showPinModal().then(function (pin) {
                    beneficiaryData.readCardData(pin, data).then(function (info) {
                        $scope.cardInfo = info;

                        $cordovaSpinnerDialog.hide();
                    }).catch(failFunction);
                }).catch(failFunction);
            }).catch(failFunction);
        }

    })
    .controller('ListBeneficiaryController', function ListBeneficiaryController($scope, $localStorage, $q, $timeout, $http, beneficiaryData) {
        $scope.beneficiaries = [];
        $scope.beneficiariesByName = beneficiariesByName;
        var timeout = null;

        function beneficiariesByName(name) {
            if (timeout) {
                $timeout.cancel(timeout);
            }
            timeout = $timeout(function () {
                beneficiaryData.listBeneficiariesByName(name).then(function (beneficiaries) {
                    $scope.beneficiaries = beneficiaries;
                })
                timeout = null;
            }, 500);

            return timeout;
        }

    })
    .controller('ViewBeneficiaryController', function ViewBeneficiaryController($scope, $localStorage, $q, $timeout, $http, $state,
        talonRoot, beneficiaryData, $cordovaSpinnerDialog, $ionicModal, $cordovaBarcodeScanner) {
        $scope.voucherBook = $scope.$new();

        beneficiaryData.fetchBeneficiaryById($state.params.id).then(function (beneficiaries) {
            $scope.beneficiary = beneficiaries;

            $scope.voucherBook.scan = function () {
                var failFunction = function (error) {
                    console.log(error);
                };

                if (window.cordova && window.cordova.plugins && window.cordova.plugins.barcodeScanner) {
                    $cordovaBarcodeScanner.scan().then(function (result) {
                        var code = result.text;
                        if (result.cancelled) {
                            console.log(result.cancelled);
                            return;
                        }

                        beneficiaryData.assignVoucherBook($scope.beneficiary.Id, $scope.voucherBook.selectedDistributionId, code).then(function () {
                            $scope.voucherBook.modal.hide();
                        }).catch(failFunction);
                    });
                } else {
                    if (DEBUG) {
                        console.log('DEBUGGING');
                        beneficiaryData.assignVoucherBook($scope.beneficiary.Id, $scope.voucherBook.selectedDistributionId, '100100').then(function () {
                            $scope.voucherBook.modal.hide();
                        }).catch(failFunction);
                    }
                    return;
                }
            };
            $scope.voucherBook.updateDistribution = function (distribution) {
                $scope.voucherBook.selectedDistributionId = distribution.id;
            }

            $scope.voucherBook.cancel = function () {
                $scope.voucherBook.modal.hide();
            };

            $scope.setPin = function () {
                var failFunction = function (error) {
                    console.log(error);
                };
                var beneficiaryId = $scope.beneficiary.Id;

                $scope.showPinModal().then(function (pin) {
                    $cordovaSpinnerDialog.show('PIN', 'Updating PIN.', true);
                    beneficiaryData.setPin(beneficiaryId, pin).then(function () {
                        $cordovaSpinnerDialog.hide();

                    }).catch(failFunction);
                }).catch(failFunction);
            };

            $scope.provisionCard = function () {
                var failFunction = function (error) {
                    console.log(error);
                    $cordovaSpinnerDialog.hide();
                };

                var beneficiaryId = $scope.beneficiary.Id;
                $cordovaSpinnerDialog.show('Read Card', 'Please hold NFC card close to reader', true);

                beneficiaryData.provisionBeneficiary(beneficiaryId).then(function () {
                    $cordovaSpinnerDialog.hide();

                }).catch(failFunction);
            };

            $scope.assignVoucherBook = function () {
                $ionicModal.fromTemplateUrl('templates/assign-voucher-book.html', {
                    scope: $scope.voucherBook,
                }).then(function (modal) {
                    $scope.voucherBook.modal = modal;
                    $scope.voucherBook.modal.show();

                    beneficiaryData.listDistributions($scope.beneficiary.Id).then(function (distributions) {
                        $scope.voucherBook.distributions = distributions;
                        $scope.voucherBook.selectedDistributionId = null;
                    });
                });
            };
        });
    })

;
