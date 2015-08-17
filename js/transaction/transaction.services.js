/* global moment */

angular.module('talon.transaction')
    .service('transactionData', function beneficiaryData($http, $localStorage, $q, talonRoot,
        $timeout, $cordovaFile, $cordovaFileTransfer, $settings, transactionHistoryDB,
        $rootScope, cardLoadHistoryDB, beneficiaryData, httpUtils, gettext, $filter) {
        var translate = $filter('translate');

        return {
            processTransaction: processTransaction,
            loadCurrentData: loadCurrentData,
            debitCard: debitCard,
            debitQRCodes: debitQRCodes
        };


        function loadCurrentData(pin, data) {
            var failFunction = function (error) {
                console.log(error);
                throw error;
            };

            return beneficiaryData.readCardData(pin, data).then(function (card) {
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
                alert(error.message);
                def.reject([-2, error]);
            };

            var currentPayload = info.current;
            var pendingPayload = info.pending;
            var beneficiary = info.beneficiary;

            var value = (currentPayload[0] + pendingPayload[0]) - amount;
            var time = pendingPayload[0] > 0 ? pendingPayload[1].unix() : currentPayload[1];


            value = Math.round(value * 1000) / 1000;
            $settings.hashApplication().then(function (hash) {
                var payload = '1933|' + value + '|' + time.toString(16);
                if ($localStorage.authorizationData.tokenType == 2) {
                    alert(translate(gettext('You are logged in as an administrator. The POS mode is available for demo use only. The transaction will not be completed.')));
                    def.resolve();
                    return;
                }

                if (time > currentPayload[1]) {
                    var cardLoad = {
                        _id: beneficiary.BeneficiaryId + '-' + moment().unix(),
                        beneficiaryId: beneficiary.BeneficiaryId,
                        amount: pendingPayload[0],
                        date: moment().unix(),
                        distributionDate: pendingPayload[1].unix()
                    };

                    cardLoadHistoryDB.upsert(cardLoad._id, cardLoad);
                }

                $timeout(function () {
                    beneficiaryData.updateCardData(payload, beneficiary.CardKey, pin, beneficiary.CardId).then(function (update) {
                        processTransaction({
                            type: 2,
                            beneficiaryId: beneficiary.BeneficiaryId,
                            amountCredited: amount,
                            amountRemaining: value,
                            date: moment().unix(),
                            checksum: hash
                        }).then(function () {
                            def.resolve();
                        }).catch(failFunction);
                    }).catch(failFunction);
                }, 500);
            }).catch(failFunction);

            return def.promise
        }



        function debitQRCodes(vouchers, beneficiary) {
            var def = $q.defer();
            var failFunction = function (error) {
                console.log('Failed!!!!');
                def.resolve();
            };

            $settings.hashApplication().then(function (hash) {
                if ($localStorage.authorizationData.tokenType == 2) {
                    alert(translate(gettext('You are logged in as an administrator. The POS mode is available for demo use only. The transaction will not be completed.')));
                    def.resolve();
                    return;
                }


                var promises = vouchers.map(function (v) {
                    return processTransaction({
                        type: 3,
                        beneficiaryId: beneficiary.BeneficiaryId,
                        voucherCode: v,
                        date: moment().unix(),
                        checksum: hash
                    });
                })

                $q.when(promises).then(function (results) {
                    console.log(results);

                    console.log('Transaction Processed!!!')
                    def.resolve();
                }).catch(failFunction);
            }).catch(failFunction);

            return def.promise
        }

        function processTransaction(transaction) {
            var def = $q.defer();
            transaction.transactionCode = forge.util.bytesToHex(forge.random.getBytes(8));
            transaction._id = transaction.beneficiaryId + '-' + transaction.date + '-' + transaction.transactionCode;
            transaction.location = $rootScope.currentLocation;
            transaction.quarantine = false;

            httpUtils.checkConnectivity().then(function () {
                console.log('Process Transaction Online');
                var url = transaction.type == 2 ? 'ProcessNFCTransaction' : 'ProcessQRTransaction'
                $http.post(talonRoot + 'api/App/MobileClient/' + url, transaction).then(function (response) {
                    if (response.data) {
                        response = response.data;
                    }
                    if (!response.Success) {
                        def.reject(response.message);
                        return;
                    }

                    transaction.confirmationCode = response.ConfirmationCode;
                    transactionHistoryDB.upsert(transaction._id, transaction);
                    def.resolve();
                })
            }).catch(function () {
                transaction.quarantine = true;
                transactionHistoryDB.upsert(transaction._id, transaction);
                def.resolve();
            });
            return def.promise
        }
    })

;
