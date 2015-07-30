/* global moment */

angular.module('talon.transaction')
    .service('transactionData', function beneficiaryData($http, $localStorage, $q, talonRoot,
        $timeout, $cordovaFile, $cordovaFileTransfer, $settings, transactionHistoryDB, $rootScope,
        beneficiaryData, httpUtils) {

        return {
            processTransaction: processTransaction,
            debitCard: debitCard
        };

        function debitCard(amount, pin) {

            var def = $q.defer();
            var catchException = function (error) {
                def.reject([-2, error]);
            };

            beneficiaryData.readCardData(pin).then(function (card) {
                var info = card.payload;
                var beneficiary = card.beneficiary;

                var value = info[0] - amount;
                if (value >= 0 && amount > 0) {
                    value = Math.round(value * 1000) / 1000;
                    $settings.hashApplication().then(function (hash) {
                        var payload = '1933|' + value + '|' + info[1].toString(16);
                        $timeout(function () {
                            beneficiaryData.updateCardData(payload, beneficiary.CardKey, pin).then(function (update) {
                                processTransaction({
                                    beneficiary: beneficiary,
                                    amountCredited: amount,
                                    amountRemaining: value,
                                    date: moment().unix(),
                                    checksum: hash
                                }).then(function () {
                                    def.resolve();
                                });
                            });
                        }, 500);
                    });
                } else {
                    def.reject([-1, 'Not enough credit.']);
                }
            }).catch(catchException);

            return def.promise
        }

        function processTransaction(transaction) {
            var def = $q.defer();
            console.log('Writing transaction record in db');
            transaction._id = transaction.beneficiary.BeneficiaryId + '-' + transaction.date;
            transaction.transactionCode = forge.util.bytesToHex(forge.random.getBytes(8));
            transaction.location = $rootScope.currentLocation;
            transactionHistoryDB.put(transaction);
            console.log(transaction);

            httpUtils.checkConnectivity().then(function () {
                console.log('Process Transaction Online');
                $http.post(talonRoot + 'api/App/MobileClient/ProcessNFCTransaction', transaction).then(function () {
                    def.resolve();
                })
            }).catch(function () {
                console.log('Process Transaction Offline');

                def.resolve();
            });
            return def.promise
        }
    })

;
