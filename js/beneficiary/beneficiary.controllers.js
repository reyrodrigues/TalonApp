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
            $scope.showPinModal().then(function (pin) {
                $cordovaSpinnerDialog.show('Read Card', 'Please hold NFC card close to reader', true);
                beneficiaryData.readCardData(pin).then(function (info) {
                    $scope.cardInfo = info;
                    
                    $cordovaSpinnerDialog.hide();
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
    .controller('ViewBeneficiaryController', function ViewBeneficiaryController($scope, $localStorage, $q, $timeout, $http, $state, talonRoot, beneficiaryData) {
        $scope.provisionCard = function () {
            var beneficiaryId = $scope.beneficiary.Id;
            beneficiaryData.provisionBeneficiary(beneficiaryId).then(function () {});
        };

        beneficiaryData.fetchBeneficiaryById($state.params.id).then(function (beneficiaries) {
            $scope.beneficiary = beneficiaries;
        });
    })

;
