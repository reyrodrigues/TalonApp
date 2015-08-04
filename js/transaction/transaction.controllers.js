angular.module('talon.transaction')

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
    .controller('POSController', function POSController($scope, $ionicModal, $q, transactionData, beneficiaryData,
        $cordovaSpinnerDialog, $timeout, $cordovaBarcodeScanner, $filter) {

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

        $scope.processQR = function () {
            var failFunction = function (error) {
                alert(error.message);
            };

            if (DEBUG) {
                var code = localStorage.qrCode;
                $scope.showPinModal().then(function (pin) {
                    console.log(code);

                    beneficiaryData.validateQRCode(code, pin).then(function (voucher) {
                        $scope.showQRConfirmationModal(voucher, pin).then(function (vouchers) {
                            var beneficiary = vouchers[0].beneficiary;
                            var voucherCodes = vouchers.map(function (v) {
                                return v.voucherCode;
                            });

                            transactionData.debitQRCodes(voucherCodes, beneficiary)
                                .then(function () {
                                    var amountToBeCharged = vouchers.map(function (a) {
                                        return a.value;
                                    }).reduce(function (a, b) {
                                        return a + b;
                                    }, 0);

                                    TransactionCompleted(amountToBeCharged);
                                })
                                .catch(failFunction);
                        }).catch(failFunction);
                    }).catch(failFunction);
                });
                return;
            }

            $cordovaBarcodeScanner.scan().then(function (result) {
             console.log(JSON.stringify(result));
             
                if (result.cancelled) {
                    return;
                }
                var code = result.text;

                $scope.showPinModal().then(function (pin) {
                    beneficiaryData.validateQRCode(code, pin).then(function (voucher) {
                        if (moment.unix(voucher.validAfter) > moment()) {
                            alert('Voucher can\'t be used before ' + moment.unix(voucher.validAfter).locale('en-Us').format('L') + '.');
                            return;
                        }

                        $scope.showQRConfirmationModal(voucher, pin).then(function (vouchers) {
                            var beneficiary = vouchers[0].beneficiary;
                            var voucherCodes = vouchers.map(function (v) {
                                return v.voucherCode;
                            });

                            transactionData.debitQRCodes(voucherCodes, beneficiary)
                                .then(function () {
                                    var amountToBeCharged = vouchers.map(function (a) {
                                        return a.value;
                                    }).reduce(function (a, b) {
                                        return a + b;
                                    }, 0);

                                    TransactionCompleted(amountToBeCharged);
                                })
                                .catch(failFunction);
                        }).catch(failFunction);
                    }).catch(failFunction);
                }).catch(failFunction);
            }).catch(failFunction);
        };

        $scope.process = function () {
            var afterTimeout = function (error) {
                console.log(error);

                $cordovaSpinnerDialog.hide();
                $scope.clear();
            };

            var invalidCardOrPin = function (argument) {
                alert('Invalid PIN.');
                $cordovaSpinnerDialog.hide();
            };
            var noCredits = function (argument) {
                alert('Not enough credit');
                $cordovaSpinnerDialog.hide();
            };

            if (!$scope.value) {
                alert('There is no value to be charged.');
                return;
            }

            $cordovaSpinnerDialog.show('Read Card', 'Please hold NFC card close to reader', true);
            beneficiaryData.readRawCardData().then(function (rawCardData) {
                $cordovaSpinnerDialog.hide();

                $scope.showPinModal().then(function (pin) {
                    var amountToBeCharged = parseFloat($scope.value, 10);
                    transactionData.loadCurrentData(pin, rawCardData).then(function (data) {
                        $scope.clear();

                        $scope.showConfirmationModal({
                            card: data,
                            value: amountToBeCharged
                        }, pin).then(function () {
                            $cordovaSpinnerDialog.show('Read Card', 'Please hold NFC card close to reader', true);
                            transactionData.debitCard(data, amountToBeCharged, pin).then(function () {
                                $cordovaSpinnerDialog.hide();

                                TransactionCompleted(amountToBeCharged);
                            }).catch(noCredits);
                        })
                    }).catch(invalidCardOrPin);
                }).catch(afterTimeout);
            }).catch(afterTimeout);

        };

        function ParseNumber() {
            $scope.number = $scope.value;
        }

        function TransactionCompleted(amount) {
            console.log('Finishing up' + amount);
            alert('The transaction in the amount of ' + $filter('currency')(amount, $scope.country.CurrencyIsoCode + ' ') + ' has been completed.');
        }
    })
    .controller('ConfirmationController', function PinController($scope, $location, $timeout) {
        $scope.$watch('data', function () {
            if ($scope.data) {
                $scope.total = $scope.data.card.current[0] +
                    $scope.data.card.pending[0] -
                    $scope.data.value;

                console.log($scope.total);
            }
        })
        $scope.cancel = function () {
            delete $scope.data;
            delete $scope.pin;

            $scope.modal.hide();
            $scope.deferred.reject();
        }
        $scope.pay = function () {
            delete $scope.data;
            delete $scope.pin;

            $scope.modal.hide();
            $scope.deferred.resolve();
        }
    })


.controller('QRConfirmationController', function PinController($scope, $location, $cordovaBarcodeScanner, beneficiaryData, $timeout) {
    $scope.addVoucher = function () {
        var failFunction = function (error) {
            alert(error.message);
            $cordovaSpinnerDialog.hide();
        };
        var pin = $scope.pin;

        if (window.cordova && window.cordova.plugins && window.cordova.plugins.barcodeScanner) {
            $cordovaBarcodeScanner.scan().then(function (result) {
                var code = result.text;
                if (result.cancelled) {
                    console.log(result.cancelled);
                    return;
                }

                beneficiaryData.validateQRCode(code, pin).then(function (voucher) {
                    var currentCodes = $scope.vouchers.map(function (v) {
                        return v.voucherCode;
                    });

                    var beneficiary = $scope.vouchers[0].beneficiary;;
                    if (moment.unix(voucher.validAfter) > moment()) {
                        alert('Voucher can\'t be used before ' + moment.unix(voucher.validAfter).locale('en-Us').format('L') + '.');
                        return;
                    }
                    if (voucher.beneficiary.BeneficiaryId != beneficiary.BeneficiaryId) {
                        alert('Voucher belongs to a different beneficiary.');
                        return;
                    }
                    if (currentCodes.indexOf(voucher.voucherCode) > -1) {
                        alert('Voucher already added');
                        return;
                    }

                    $scope.vouchers.push(voucher);
                }).catch(failFunction);
            });
        }
    };

    $scope.cancel = function () {
        delete $scope.vouchers;
        delete $scope.pin;

        $scope.modal.hide();
        $scope.deferred.reject();
    }
    $scope.pay = function () {
        $scope.deferred.resolve($scope.vouchers);
        delete $scope.vouchers;
        delete $scope.pin;

        $scope.modal.hide();
    }
})




;
