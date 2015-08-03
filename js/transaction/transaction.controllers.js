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
    .controller('POSController', function POSController($scope, $ionicModal, $q, transactionData,
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

            $scope.showPinModal().then(function (pin) {
                $cordovaSpinnerDialog.show('Read Card', 'Please hold NFC card close to reader', true);
                var amountToBeCharged = parseFloat($scope.value, 10);
                transactionData.loadCurrentData(pin).then(function (data) {
                    $scope.clear();
                    $cordovaSpinnerDialog.hide();

                    $scope.showConfirmationModal({
                        card: data,
                        value: amountToBeCharged
                    }, pin).then(function () {
                        $cordovaSpinnerDialog.show('Read Card', 'Please hold NFC card close to reader', true);
                        transactionData.debitCard(data, amountToBeCharged, pin).then(function () {
                            $cordovaSpinnerDialog.hide();
                        }).catch(noCredits);
                    })
                }).catch(invalidCardOrPin);
            }).catch(afterTimeout);
        };

        function ParseNumber() {
            $scope.number = $scope.value;
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



;
