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
        $cordovaSpinnerDialog, $timeout, $filter, gettext) {
        var translate = $filter('translate');

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

        $scope.qrDialogOpen = false;

        $scope.processQR = function () {
            var failFunction = function (error) {
                $scope.qrDialogOpen = false;
                alert(error.message);
                console.log(error);
            };

            if ($scope.qrDialogOpen) {
                return;
            }
            $scope.qrDialogOpen = true;

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

            if (window.cordova && window.cordova.plugins && cordova.plugins.barcodeScanner) {
                cordova.plugins.barcodeScanner.scan(function win(result) {
                    $timeout(function () {
                        $scope.qrDialogOpen = false;

                        if (result.cancelled) {
                            return;
                        }
                        var code = result.text;

                        $scope.showPinModal().then(function (pin) {
                            beneficiaryData.validateQRCode(code, pin).then(function (voucher) {
                                if (moment.unix(voucher.validAfter) > moment()) {
                                    alert(translate(gettext('Voucher can\'t be used before')) +
                                        ' ' + moment.unix(voucher.validAfter).format('L') + '.');
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
                    });

                }, failFunction);
            }
        };

        $scope.process = function () {
            var afterTimeout = function (error) {
                console.log(error);

                $cordovaSpinnerDialog.hide();
                $scope.clear();
            };

            var invalidCardOrPin = function (argument) {
                alert(translate(gettext('Invalid PIN.')));
                $cordovaSpinnerDialog.hide();
            };
            var noCredits = function (argument) {
                alert(translate(gettext('Not enough credit')));
                $cordovaSpinnerDialog.hide();
            };

            if (!$scope.value) {
                alert(translate(gettext('There is no value to be charged.')));
                return;
            }

            $cordovaSpinnerDialog.show(translate(gettext('Read Card')), translate(gettext('Please hold NFC card close to reader')), true);
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
                            $cordovaSpinnerDialog.show(translate(gettext('Proccessing Transaction')), translate(gettext('Please wait')), true);
                            transactionData.debitCard(data, amountToBeCharged, pin).then(function () {
                                $cordovaSpinnerDialog.hide();

                                TransactionCompleted(amountToBeCharged);
                            }, noCredits, function (arg) {
                                if (arg === 'CARD') {
                                    $cordovaSpinnerDialog.hide();
                                    $cordovaSpinnerDialog.show(translate(gettext('Read Card')), translate(gettext('Please hold NFC card close to reader')), true);
                                }
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
            alert(translate(gettext('The transaction in the amount of')) + ' ' + $filter('currency')(amount, $scope.country.CurrencyIsoCode + ' ') + ' ' + translate(gettext('has been completed.')));
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


.controller('QRConfirmationController', function PinController($scope, $location, beneficiaryData, $timeout, gettext, $filter) {
    var translate = $filter('translate');
    $scope.addVoucher = function () {
        var failFunction = function (error) {
            alert(error.message);
            $cordovaSpinnerDialog.hide();
        };
        var pin = $scope.pin;


        if (window.cordova && window.cordova.plugins && cordova.plugins.barcodeScanner) {
            cordova.plugins.barcodeScanner.scan(function win(result) {
                $timeout(function () {
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
                            alert(translate(gettext('Voucher can\'t be used before')) +
                                ' ' + moment.unix(voucher.validAfter).format('L') + '.');
                            return;
                        }
                        if (voucher.beneficiary.BeneficiaryId != beneficiary.BeneficiaryId) {
                            alert(translate(gettext('Voucher belongs to a different beneficiary.')));
                            return;
                        }
                        if (currentCodes.indexOf(voucher.voucherCode) > -1) {
                            alert(translate(gettext('Voucher already added')));
                            return;
                        }

                        $scope.vouchers.push(voucher);
                    }).catch(failFunction);
                });
            }, failFunction);
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
