angular.module('talon.beneficiary')
    .service('beneficiaryData', function beneficiaryData($http, $localStorage, keyDB, cardLoadDB, $q, talonRoot,
        $nfcTools, $ionicPlatform, $timeout, $cordovaFile, $cordovaFileTransfer, httpUtils, encryption, $state) {



        return {
            reloadCard: ReloadCard,
            readCardData: ReadCardData,
            updateCardData: UpdateCardData,
            provisionBeneficiary: ProvisionBeneficiary,
            listBeneficiariesByName: ListBeneficiariesByName,
            fetchBeneficiaryById: FetchBeneficiaryById
        };

        function ProvisionBeneficiary(beneficiaryId, pin) {
            var def = $q.defer();

            $ionicPlatform.ready(function () {
                $nfcTools.readId(pin).then(function (id) {
                    $http.post(talonRoot + 'api/App/MobileClient/ProvisionBeneficiary', {
                        'beneficiaryId': beneficiaryId,
                        'cardId': id
                    }).then(function (k) {
                        var key = k.data;

                        keyDB.upsert(key._id, function (d) {
                            return {
                                BeneficiaryId: key.BeneficiaryId,
                                CardId: key.CardId,
                                CardKey: key.CardKey
                            };
                        });

                        $http.get(talonRoot + 'api/App/MobileClient/GenerateInitialLoad?beneficiaryId=' + key.BeneficiaryId).then(function (res) {
                            var payload = res.data;
                            payload = forge.util.bytesToHex(forge.util.decode64(payload));

                            $nfcTools.writeData(payload, key.CardId).then(def.resolve.bind(def));
                        });
                    });
                }).catch(function () {
                    def.reject();
                });
            });

            return def.promise
        }

        function ReadCardData(pin) {
            return $nfcTools.readIdAndData().then(function (cardData) {
                return FetchBeneficiary(cardData.id).then(function (beneficiary) {
                    return DecryptCardData(cardData.data, beneficiary.CardKey, pin).then(function (payload) {
                        return {
                            beneficiary: beneficiary,
                            payload: payload
                        }
                    });
                })
            });
        }

        // Reload Card
        function ReloadCard(pin) {
            var def = $q.defer();
            var failFunction = function (error) {
                console.log(error);
                def.reject(error);
            };

            ReadCardData(pin).then(function (card) {
                var cardPayload = card.payload;
                var beneficiary = card.beneficiary;
                var since = moment.unix(cardPayload[1]);
                var currentAmount = cardPayload[0];

                cardLoadDB.find({
                    selector: {
                        CardId: beneficiary.CardId
                    }
                }).then(function (res) {
                    var loads = res.docs[0].Load;

                    var data = loads.map(function (d) {
                        var encryptedData = forge.util.decode64(d);
                        var decrypted = encryption.decrypt(encryptedData, pin, beneficiary.CardKey);
                        if (!decrypted)
                            throw new Error();

                        var values = decrypted.split('|');
                        return [parseFloat(values[1], 10), moment.unix(parseInt(values[2], 16))];
                    });

                    var load = data
                        .filter(function (d) {
                            return d[1] > since;
                        })
                        .reduce(function (a, b) {
                            // Sum first item
                            // Get largest of the second
                            return [a[0] + b[0], a[1] > b[1] ? a[1] : b[1]];
                        }, [0, 0]);
                    if (load[0] == 0 && load[1] == 0) {
                        // No loads
                        console.log('No loads for this card');
                        def.resolve();
                    } else {
                        var payload = '1933|' + (load[0] + currentAmount) + '|' + load[1].unix().toString(16);
                        $timeout(function () {
                            UpdateCardData(payload, beneficiary.CardKey, pin, beneficiary.CardId)
                                .then(function (update) {
                                    def.resolve();
                                }).catch(failFunction);
                        }, 500);
                    }


                }).catch(failFunction);
            }).catch(failFunction);

            return def.promise;
        }

        function UpdateCardData(data, key, pin, id) {
            var encrypedB64 = encryption.encrypt(data, pin, key);
            var encrypted = forge.util.createBuffer(forge.util.decode64(encrypedB64), 'raw').toHex();
            var def = $q.defer();


            $nfcTools.writeData(encrypted, id).then(function (result) {
                def.resolve(result);
            });

            return def.promise;
        }

        function DecryptCardData(cardData, key, pin) {
            var def = $q.defer();
            var firstIndex = cardData.indexOf('0000');
            if (firstIndex % 2 == 1)
                firstIndex += 1;


            var dataToZero = firstIndex > -1 ? cardData.substring(0, firstIndex) : cardData;
            console.log('Data');
            console.log(dataToZero);

            var encryptedData = forge.util.hexToBytes(dataToZero);
            var decrypted = encryption.decrypt(encryptedData, pin, key);

            if (!decrypted) {
                def.reject();

                return def.promise;
            }

            var values = decrypted.split('|');
            var currentCard = [parseFloat(values[1], 10), parseInt(values[2], 16)];

            def.resolve(currentCard);

            return def.promise;
        }

        function FetchBeneficiary(id) {
            var def = $q.defer();

            keyDB.find({
                selector: {
                    CardId: id
                }
            }).then(function (s) {
                if (s.docs.length) {
                    def.resolve(s.docs[0]);
                }
                def.reject();
            });

            return def.promise;
        }

        function ListBeneficiariesByName(name) {
            var filter = '$filter=startswith(tolower(FirstName), \'' + encodeURIComponent(name.toLowerCase()) + '\') or ' + 'startswith(tolower(LastName), \'' + encodeURIComponent(name.toLowerCase()) + '\')';

            return $http.get(talonRoot + 'Breeze/EVM/Beneficiaries?' + filter).then(function (res) {
                return res.data;
            });
        };

        function FetchBeneficiaryById(id) {
            return $http.get(talonRoot + 'Breeze/EVM/Beneficiaries?$expand=Location&$filter=Id eq ' + $state.params.id + '').then(function (res) {
                return res.data[0];
            });
        }
    })


;
