/* global moment */

angular.module('talon.transaction')
    .service('transactionData', function beneficiaryData($http, $localStorage, $q, talonRoot,
        $timeout, $cordovaFile, $cordovaFileTransfer, $settings, transactionHistoryDB, $rootScope,
        beneficiaryData, httpUtils) {

        return {
            processTransaction: processTransaction,
            loadCurrentData: loadCurrentData,
            debitCard: debitCard
        };

        function loadCurrentData(pin) {
            var failFunction = function (error) {
                console.log(error);
                throw error;
            };

            return beneficiaryData.readCardData(pin).then(function (card) {
                return beneficiaryData.fetchPendingLoads(pin, card).then(function (load) {
                    var beneficiary = card.beneficiary;
                    var currentPayload = card.payload;
                    var pendingPayload = load.pending;

                    return {
                        beneficiary: beneficiary,
                        current: currentPayload,
                        pending: pendingPayload
                    };
                }).catch(failFunction);
            }).catch(failFunction);
        }

        function debitCard(info, amount, pin) {
            var def = $q.defer();
            var failFunction = function (error) {
                def.reject([-2, error]);
            };

            var currentPayload = info.current;
            var pendingPayload = info.pending;
            var beneficiary = info.beneficiary;

            var value = (currentPayload[0] + pendingPayload[0]) - amount;
            var time = pendingPayload[0] > 0 ? pendingPayload[1].unix() : currentPayload[1];


            if (value >= 0 && amount > 0) {
                value = Math.round(value * 1000) / 1000;
                $settings.hashApplication().then(function (hash) {
                    var payload = '1933|' + value + '|' + time.toString(16);
                    if ($localStorage.authorizationData.tokenType == 2) {
                        alert('You are logged in as an administrator. The POS mode is available for demo use only. The transaction will not be completed.')
                        def.resolve();
                        return;
                    }
                    $timeout(function () {
                        beneficiaryData.updateCardData(payload, beneficiary.CardKey, pin, beneficiary.CardId).then(function (update) {
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
