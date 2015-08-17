angular.module('talon.beneficiary')
    .service('beneficiaryData', function beneficiaryData($http, $localStorage, keyDB, cardLoadDB, $q, talonRoot, qrCodeDB,
        $nfcTools, $ionicPlatform, $timeout, $cordovaFile, $cordovaFileTransfer, httpUtils, encryption, $state, gettext, $filter) {
var translate = $filter('translate')


        return {
            reloadCard: ReloadCard,
            readCardData: ReadCardData,
            readRawCardData: ReadRawCardData,
            updateCardData: UpdateCardData,
            provisionBeneficiary: ProvisionBeneficiary,
            listBeneficiariesByName: ListBeneficiariesByName,
            fetchBeneficiaryById: FetchBeneficiaryById,
            fetchPendingLoads: FetchPendingLoads,
            validateQRCode: validateQRCode,
            setPin: SetPin,
            listDistributions: ListDistributions,
            assignVoucherBook: AssignVoucherBook
        };


        function validateQRCode(code, pin) {
            return qrCodeDB.find(
                function (o) {
                    return o.VoucherCode == code;
                }
            ).then(function (res) {
                var docs = res;
                if (docs.length == 0) {
                    throw new Error(translate(gettext('Invalid voucher.')));
                }
                var voucher = docs[0];
                return keyDB.find(
                    function (o) {
                        return o.BeneficiaryId == voucher.BeneficiaryId;
                    }).then(function (res) {
                    if (res.length == 0) {
                        throw new Error(translate(gettext('Beneficiary not registered')));
                    }

                    var beneficiary = res[0];
                    var encryptedData = forge.util.decode64(voucher.Payload);
                    var decryptedString = encryption.decrypt(encryptedData, pin, beneficiary.CardKey);

                    if (!decryptedString) {
                        throw new Error(translate(gettext('Invalid pin.')));
                    }

                    var voucherValues = decryptedString.split('|');
                    var value = parseFloat(voucherValues[1], 10);
                    var validAfter = parseInt(voucherValues[2], 16);
                    var voucherCode = voucherValues[3];

                    return {
                        value: value,
                        validAfter: validAfter,
                        voucherCode: voucherCode,
                        beneficiary: beneficiary
                    }
                })
            });
        }

        function ProvisionBeneficiary(beneficiaryId) {
            var def = $q.defer();

            $nfcTools.readId().then(function (id) {
                $http.post(talonRoot + 'api/App/MobileClient/ProvisionBeneficiary', {
                    'beneficiaryId': beneficiaryId,
                    'cardId': id
                }).then(function (k) {
                    var key = k.data;


                    keyDB.upsert(key._id, key);

                    $http.get(talonRoot + 'api/App/MobileClient/GenerateInitialLoad?beneficiaryId=' + key.BeneficiaryId).then(function (res) {
                        var payload = res.data;
                        payload = forge.util.bytesToHex(forge.util.decode64(payload));

                        $nfcTools.writeData(payload, key.CardId).then(def.resolve.bind(def));
                    });
                });
            }).catch(function () {
                def.reject();
            });

            return def.promise
        }

        function SetPin(beneficiaryId, pin) {
            return $http.post(talonRoot + 'api/App/MobileClient/SetBeneficiaryPin', {
                'beneficiaryId': beneficiaryId,
                'pin': pin
            }).then(function (k) {

            });
        }

        function AssignVoucherBook(beneficiaryId, distributionId, serialNumber) {
            return $http.post(talonRoot + 'api/App/MobileClient/AssignVoucherBook', {
                'beneficiaryId': beneficiaryId,
                'distributionId': distributionId,
                'serialNumber': serialNumber
            }).then(function (k) {});
        }

        function ListDistributions(beneficiaryId) {
            return $http.get(talonRoot + 'api/App/MobileClient/ListDistributionsForBeneficiary?beneficiaryId=' + beneficiaryId).then(function (res) {
                return res.data;
            });
        }

        function ReadRawCardData() {
            var def = $q.defer();
            var resolved = false;
            var timeout = $timeout(function () {
                if (!resolved) {
                    resolved = true;
                    def.reject();
                }
            }, 15e3);

            $nfcTools.readIdAndData().then(function (cardData) {
                if (!resolved) {
                    $timeout.cancel(timeout);

                    def.resolve(cardData);
                    resolved = true;
                }
            });

            return def.promise;
        }

        function ReadCardData(pin, data) {
            var dataPromise = null;

            if (data) {
                dataPromise = $q.when(data);
            } else {
                dataPromise = $q.when(ReadRawCardData());
            }
            console.log('Acquiring data');

            return dataPromise.then(function (cardData) {
                console.log('ed data');
                console.log(cardData);
                return FetchBeneficiary(cardData.id).then(function (beneficiary) {
                    console.log('beneficiary');
                    console.log(cardData.data, beneficiary.CardKey, pin);
                    return DecryptCardData(cardData.data, beneficiary.CardKey, pin).then(function (payload) {
                        console.log('decrypted');

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
            FetchPendingLoads(pin).then(function (pendingLoad) {
                var load = pendingLoad.pending
                var cardPayload = pendingLoad.card.payload;
                var beneficiary = pendingLoad.card.beneficiary;
                var currentAmount = cardPayload[0];
                if (load[0] == 0) {
                    def.resolve();
                    return;
                }

                var payload = '1933|' + (load[0] + currentAmount) + '|' + load[1].unix().toString(16);
                $timeout(function () {
                    UpdateCardData(payload, beneficiary.CardKey, pin, beneficiary.CardId)
                        .then(function (update) {
                            def.resolve();
                        }).catch(failFunction);
                }, 500);
            }).catch(failFunction);

            return def.promise;
        }

        function FetchPendingLoads(pin, cardLoad) {
            var def = $q.defer();
            var failFunction = function (error) {
                console.log(error);
                def.reject(error);
            };

            var preloadDef = $q.defer();
            if (cardLoad) preloadDef.resolve(cardLoad);
            else ReadCardData(pin).then(preloadDef.resolve.bind(preloadDef));

            preloadDef.promise.then(function (card) {
                var cardPayload = card.payload;
                var beneficiary = card.beneficiary;
                var since = moment.unix(cardPayload[1]);
                var currentAmount = cardPayload[0];

                cardLoadDB.find(function (o) {
                    return o.CardId == beneficiary.CardId
                }).then(function (res) {
                    if (res.length == 0) {
                        def.resolve({
                            pending: [0, 0],
                            card: card
                        });
                    }

                    var loads = res[0].Load;

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
                        def.resolve({
                            pending: [0, 0],
                            card: card
                        });
                    } else {
                        def.resolve({
                            pending: load,
                            card: card
                        });
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

            keyDB.find(
                function (o) {
                    return o.CardId == id;
                }
            ).then(function (s) {
                if (s.length) {
                    def.resolve(s[0]);
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
