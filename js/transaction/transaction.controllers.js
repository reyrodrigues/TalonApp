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
            var afterTimeout = function (argument) {
             console.log(argument);
                $cordovaSpinnerDialog.hide();
                $scope.clear();
            };

            $scope.showPinModal().then(function (pin) {
                $cordovaSpinnerDialog.show('Read Card', 'Please hold NFC card close to reader', true);
                transactionData.debitCard(parseFloat($scope.value, 10), pin).then(function () {
                    $cordovaSpinnerDialog.hide();
                    $scope.clear();
                }).catch(afterTimeout);
            }).catch(afterTimeout);
        };

        function ParseNumber() {
            $scope.number = $scope.value;
        }
    })

;
