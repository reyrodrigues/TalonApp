angular.module('talon.services', [
        'ngStorage',
        'talon.constants',
        'pouchdb'
    ])
    .service('beneficiaryData', function beneficiaryData($http, $localStorage, pouchDB, pouchDBDecorators, $q, talonRoot,
        $nfcTools, $ionicPlatform, $timeout, $cordovaFile, $cordovaFileTransfer) {
        var keyDB = pouchDB('keyStore', {
            adapter: 'websql'
        });

        var cardLoadDB = pouchDB('cardLoadStore', {
            adapter: 'websql'
        });

        var cardLoadHistoryDB = pouchDB('cardLoadHistoryStore', {
            adapter: 'websql'
        });

        var transactionHistoryDB = pouchDB('transactionHistoryStore', {
            adapter: 'websql'
        });


        keyDB.createIndex({
            index: {
                fields: ['CardId']
            }
        });
        keyDB.createIndex({
            index: {
                fields: ['BeneficiaryId']
            }
        });

        cardLoadDB.createIndex({
            index: {
                fields: ['CardId']
            }
        });


        updatePouchDB(keyDB);
        updatePouchDB(cardLoadDB);
        updatePouchDB(transactionHistoryDB);
        updatePouchDB(cardLoadHistoryDB);

        return {
            reloadCard: ReloadCard,

            loadKeys: LoadKeys,
            loadCardLoads: LoadCardLoads,

            sync: Sync,

            updateCard: UpdateCard,
            readCard: ReadCard,

            provisionBeneficiary: ProvisionBeneficiary,
            fetchBeneficiary: FetchBeneficiary
        };

        function Sync() {
            var def = $q.defer();
            CheckConnectivity().then(function () {
                LoadKeys().then(function () {
                    LoadCardLoads().then(function () {
                        $http.get(talonRoot + 'api/App/MobileClient/DownloadKeyset')
                            .then(function (keyset) {
                                $localStorage.keyset = keyset.data;
                                def.resolve();

                            })
                            .catch(def.resolve.bind(def));
                    });
                });
            }).catch(function () {
                LoadPayloadFromNetwork().then(def.resolve.bind(def));
            })

            def.promise
        }

        function FetchBeneficiary() {
            var def = $q.defer();
            $ionicPlatform.ready(function () {
                $nfcTools.acr35ReadIdFromTag().then(function (result) {
                    var id = result[0];
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
                });
            });

            return def.promise;
        }

        function ProvisionBeneficiary(beneficiaryId, pin) {
            var def = $q.defer();

            $ionicPlatform.ready(function () {
                $nfcTools.acr35ReadIdFromTag().then(function (result) {
                    var id = result[0];
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
                            payload = forge.util.createBuffer(forge.util.decode64(payload), 'raw').toHex();
                            $nfcTools.acr35WriteDataIntoTag(payload).then(function (result) {
                                def.resolve();
                            });
                        });
                    });
                }).catch(function () {
                    def.reject();
                });
            });

            return def.promise
        }

        // Reload Card
        function ReloadCard(pin) {
            var def = $q.defer();
            FetchBeneficiary().then(function (beneficiary) {
                ReadCard(beneficiary.CardKey, pin).then(function (cardInfo) {
                    cardLoadDB.find({
                        selector: {
                            CardId: beneficiary.CardId
                        }
                    }).then(function (res) {
                        var loads = res.docs[0].Load;

                        var data = loads.map(function (d) {
                            var encryptedData = forge.util.decode64(d);
                            var decrypted = decrypt(encryptedData, pin, beneficiary.CardKey);
                            if (!decrypted)
                                throw new Error();

                            var values = decrypted.split('|');
                            return [parseFloat(values[1], 10), moment.unix(parseInt(values[2], 16))];
                        });

                        var since = moment.unix(cardInfo[1]);

                        var load = data
                            .filter(function (d) {
                                return d[1] > since;
                            })
                            .reduce(function (a, b) {
                                // Sum first item
                                // Get largest of the second
                                return [a[0] + b[0], a[1] > b[1] ? a[1] : b[1]];
                            }, [0, 0]);

                        var payload = '1933|' + (load[0] + cardInfo[0]) + '|' + load[1].unix().toString(16);
                        $timeout(function () {
                            UpdateCard(payload, beneficiary.CardKey, pin)
                                .then(function (update) {
                                    def.resolve();
                                }).catch(def.reject.bind(def));
                        }, 500);
                    }).catch(def.reject.bind(def));
                }).catch(def.reject.bind(def));
            }).catch(def.reject.bind(def));

            return def.promise;
        }

        function CheckConnectivity() {
            var def = $q.defer();
            $http.get(talonRoot + 'api/App/MobileClient/IsAlive').then(function (r) {
                if (r.status === 200) {
                    def.reject();
                } else {
                    def.resolve();
                }
            }).catch(def.reject.bind(def));

            return def.promise;
        }


        function LoadPayloadFromNetwork() {
            var def = $q.defer();

            $ionicPlatform.ready(function () {
                var uri = encodeURI("http://10.10.10.254/data/UsbDisk1/Volume1/Talon/" + $localStorage.country.IsoAlpha3 + ".zip");

                var localDirUri = cordova.file.tempDirectory || cordova.file.cacheDirectory;
                var logError = function (error) {
                    console.log(error);
                    def.reject();
                }

                $cordovaFile.createFile(localDirUri, 'load.zip', true).then(function (fileEntry) {
                    $cordovaFileTransfer.download(uri, fileEntry.toURL())
                        .then(function (entry) {
                            $cordovaFile.readAsArrayBuffer(localDirUri, 'load.zip').then(function (file) {
                                var zip = new JSZip(file);
                                var cardLoads = decryptRsaData(zip.file("CardLoads.b64").asText());
                                var beneficiaryKeys = decryptRsaData(zip.file("BeneficiaryKeys.b64").asText());

                                LoadCardLoadsInternal(JSON.parse(cardLoads)).then(function () {
                                    LoadKeysInternal(JSON.parse(beneficiaryKeys)).then(function () {
                                        $cordovaFile.removeFile(localDirUri, 'load.zip').then(function () {
                                            console.log('Loaded from wifi storage');

                                            def.resolve();
                                        }).catch(logError)
                                    }).catch(logError);
                                }).catch(logError);
                            }).catch(logError);
                        }).catch(logError);
                }).catch(logError)
            });


            return def.promise;
        }

        // Key Data
        function LoadKeys() {
            console.log('Internet');

            return $http.get(talonRoot + 'api/App/MobileClient/DownloadBeneficiaryKeys').then(function (k) {
                return LoadKeysInternal(k.data);
            });
        }

        function LoadKeysInternal(data) {
            return $q.all(data.map(function (key) {
                return keyDB.upsert(key._id, function (d) {
                    return {
                        BeneficiaryId: key.BeneficiaryId,
                        CardId: key.CardId,
                        CardKey: key.CardKey
                    };
                }).then(function () {
                    return key;
                });
            }));
        }

        // Card Load
        function LoadCardLoads() {
            console.log('Internet');
            return $http.get(talonRoot + 'api/App/MobileClient/GenerateCardLoads')
                .then(function (r) {
                    return LoadCardLoadsInternal(r.data);
                });
        }

        function LoadCardLoadsInternal(data) {
            return $q.all(data.map(function (load) {
                return cardLoadDB.upsert(load._id, function (d) {
                    return {
                        CardId: load.CardId,
                        Load: load.Load
                    };
                }).then(function () {
                    return load;
                });
            }));
        }


        function ReadCard(key, pin) {
            var def = $q.defer();
            $ionicPlatform.ready(function () {
                $nfcTools.acr35ReadDataFromTag().then(function (result) {
                    var firstIndex = result[0].indexOf('0000');
                    if (firstIndex % 2 == 1)
                        firstIndex += 1;

                    var dataToZero = result[0].substring(0, firstIndex);
                    var encryptedData = forge.util.hexToBytes(dataToZero);
                    var decrypted = decrypt(encryptedData, pin, key);

                    if (!decrypted)
                        def.reject();

                    var values = decrypted.split('|');
                    var currentCard = [parseFloat(values[1], 10), moment.unix(parseInt(values[2], 16)).unix()];

                    def.resolve(currentCard);
                });
            });

            return def.promise;
        }

        function UpdateCard(data, key, pin) {
            var encrypted = forge.util.createBuffer(forge.util.decode64(encrypt(data, pin, key)), 'raw').toHex();
            var def = $q.defer();
            $ionicPlatform.ready(function () {
                $nfcTools.acr35WriteDataIntoTag(encrypted).then(function (result) {
                    def.resolve(result);
                });
            });

            return def.promise;
        }

        function updatePouchDB(db) {
            // Update plugin methods to use $q

            db.find = pouchDBDecorators.qify(db.find);
            db.upsert = pouchDBDecorators.qify(db.upsert);
            db.putIfNotExists = pouchDBDecorators.qify(db.putIfNotExists);
            db.createIndex = pouchDBDecorators.qify(db.createIndex);
        }

        function encrypt(data, pin, key) {
            var cipher = forge.cipher.createCipher('AES-CBC', forge.util.createBuffer(forge.util.decode64(key), 'raw'));
            cipher.start({
                iv: forge.util.createBuffer(pin, 'utf8')
            });
            cipher.update(forge.util.createBuffer(forge.util.createBuffer(data, 'utf8')));
            cipher.finish();
            var encrypted = cipher.output;
            return forge.util.encode64(encrypted.bytes());
        }

        function decrypt(data, pin, key) {
            var decipher = forge.cipher.createDecipher('AES-CBC', forge.util.createBuffer(forge.util.decode64(key), 'raw'));
            decipher.start({
                iv: forge.util.createBuffer(pin, 'utf8')
            });
            decipher.update(forge.util.createBuffer(data, 'raw'));
            decipher.finish();
            if (decipher.output.toHex().indexOf('31393333') == 0) {
                return decipher.output.toString();
            } else {
                return null;
            }
        }

        function decryptRsaData(data) {
            // The vendor has their own private key
            var keyPEM = $localStorage.keyset.Vendor;
            var privateKey = forge.pki.privateKeyFromPem(keyPEM);

            // the data is AES-CBC encrypted but the key and IV are RSA'd
            var payload = data.split('|');
            var key = privateKey.decrypt(forge.util.decode64(payload[1]), 'RSA-OAEP');
            var iv = privateKey.decrypt(forge.util.decode64(payload[2]), 'RSA-OAEP');

            var decipher = forge.cipher.createDecipher('AES-CBC', forge.util.createBuffer(key, 'raw'));
            decipher.start({
                iv: forge.util.createBuffer(iv, 'raw')
            });
            decipher.update(forge.util.createBuffer(forge.util.decode64(payload[0]), 'raw'));

            if (decipher.finish()) {
                return decipher.output.toString();
            } else {
                return null;
            }
        }

        function encryptRsaData(data) {
            var key = forge.random.getBytesSync(16);
            var iv = forge.random.getBytesSync(16);
            var bytes = forge.util.createBuffer(data, 'utf8');

            var keyPEM = $localStorage.keyset.Server;
            var privateKey = forge.pki.publicKeyFromPem(keyPEM);

            var cipher = forge.cipher.createCipher('AES-CBC', key);

            cipher.start({
                iv: iv
            });
            cipher.update(forge.util.createBuffer(bytes));
            cipher.finish();
            var encrypted = forge.util.encode64(forge.util.hexToBytes(cipher.output.toHex()));
            var result = [
                encrypted,
                forge.util.encode64(privateKey.encrypt(key, 'RSA-OAEP')),
                forge.util.encode64(privateKey.encrypt(iv, 'RSA-OAEP'))
            ]

            return result.join('|');
        }
    })
    .service('$nfcTools', function ($timeout, $q) {

        function makePromise(fn, args, async) {
            var deferred = $q.defer();

            var success = function (response) {
                if (async) {
                    $timeout(function () {
                        deferred.resolve(response);
                    });
                } else {
                    deferred.resolve(response);
                }
            };

            var fail = function (response) {
                if (async) {
                    $timeout(function () {
                        deferred.reject(response);
                    });
                } else {
                    deferred.reject(response);
                }
            };

            args.push(success);
            args.push(fail);

            fn.apply(window.nfcTools, args);

            return deferred.promise;
        }

        var nfcTools = {
            acr35WriteDataIntoTag: function (data) {
                return makePromise(window.nfcTools.acr35WriteDataIntoTag, [data], true);
            },
            acr35ReadDataFromTag: function () {
                return makePromise(window.nfcTools.acr35ReadDataFromTag, [], true);
            },
            acr35ReadIdFromTag: function () {
                return makePromise(window.nfcTools.acr35ReadIdFromTag, [], true);
            },
            isoDepReadIdFromTag: function () {
                return makePromise(window.nfcTools.isoDepReadIdFromTag, [], true);
            }
        };

        return nfcTools;
    })
    .service('vendorAuthentication', function ($http, $q, talonRoot, $cordovaDevice, $localStorage, $rootScope) {
        var vendorAuthServiceFactory = {
            login: login
        };

        return vendorAuthServiceFactory;

        function login(userName, password) {
            var device = {};
            if (window.device) {
                device = $cordovaDevice.getDevice();
            } else {
                device.uuid = '00:00:00:00';
            }

            var payload = {
                UserName: userName,
                Password: password,
                Device: device
            }

            var deferred = $q.defer();

            $http.post(talonRoot + 'api/App/VendorProfile/Login', payload)
                .then(function (response) {
                    if (response.status == 200) {
                        $localStorage.authorizationData = {
                            userName: payload.UserName,
                            token: response.data.token,
                            uuid: device.UUID || device.uuid,
                            tokenType: 1
                        };

                        loadVendorProfile(response.data.id).then(function () {
                            deferred.resolve($localStorage.authorizationData);
                        })
                    } else {
                        deferred.reject(response.data);
                    }
                })
                .catch(function (err, status) {
                    deferred.reject(err);
                })

            return deferred.promise;
        }

        function loadVendorProfile(vendorId) {
            var deferred = $q.defer();
            if ($localStorage.currentUser) {
                $rootScope.currentUser = $localStorage.currentUser;

                if (!$localStorage.country) {
                    $localStorage.country = $rootScope.currentUser.Country;
                }

                $rootScope.country = $localStorage.country;

                deferred.resolve();
            } else {
                $http.get(talonRoot + 'api/App/VendorProfile/LoadProfile')
                    .then(function (response) {
                        $rootScope.currentUser = response.data;
                        $localStorage.currentUser = response.data;

                        if (!$localStorage.country) {
                            $localStorage.country = $rootScope.currentUser.Country;
                        }

                        $rootScope.country = $localStorage.country;

                        deferred.resolve();
                    })
                    .catch(function () {
                        console.log(arguments);
                        deferred.reject(arguments);
                    });
            }

            return deferred.promise;
        }

    })
    .service('adminAuthentication', function AuthService($http, $localStorage, $q, $rootScope, talonRoot) {
        var serviceRoot = talonRoot;
        var device = {};
        if (window.device) {
            device = $cordovaDevice.getDevice();
        } else {
            device.uuid = '00:00:00:00';
        }

        return {
            login: login,
            logOut: logOut,
            loadUserData: loadUserData
        };

        function login(username, password) {
            var data = "grant_type=password&username=" + username + "&password=" + password;
            var deferred = $q.defer();

            $http.post(serviceRoot + 'token', data, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }).success(function (response) {
                $localStorage.authorizationData = {
                    token: response.access_token,
                    userName: username,
                    uuid: device.UUID || device.uuid,
                    tokenType: 2
                };
                deferred.resolve(true);
            }).error(function (err, status) {
                logOut();
                deferred.reject(false);
            });

            return deferred.promise;
        }

        function logOut() {}

        function loadUserData() {
            var deferred = $q.defer();
            if ($localStorage.currentUser) {
                $rootScope.currentUser = $localStorage.currentUser;
                $rootScope.organization = $rootScope.currentUser.Organization;
                var countries = $rootScope.currentUser.Countries.map(function (c) {
                    return c.Country;
                });

                if (!$localStorage.country) {
                    $localStorage.country = countries[0];
                }

                $rootScope.country = $localStorage.country;

                if ($rootScope.currentUser.Countries.length > 1) {
                    $rootScope.availableCountries = countries;
                } else {
                    $rootScope.availableCountries = false;
                }
                deferred.resolve();
            } else {

                $http.get(serviceRoot + 'api/Account/Me')
                    .then(function (response) {
                        $rootScope.currentUser = response.data;
                        $localStorage.currentUser = response.data;

                        $rootScope.organization = $rootScope.currentUser.Organization;
                        $localStorage.organization = $rootScope.currentUser.Organization;
                        var countries = $rootScope.currentUser.Countries.map(function (c) {
                            return c.Country;
                        });

                        if (!$localStorage.country) {
                            $localStorage.country = countries[0];
                        }

                        $rootScope.country = $localStorage.country;

                        if ($rootScope.currentUser.Countries.length > 1) {
                            $rootScope.availableCountries = countries;
                        } else {
                            $rootScope.availableCountries = false;
                        }
                        deferred.resolve();
                    })
                    .catch(function () {
                        console.log(arguments);
                        deferred.reject(arguments);
                    });
            }

            return deferred.promise;
        }
    })


//
/*
forge.rsa.setPrivateKey(
  forge.util.decode64(keys.Vendor.Modulus),
  forge.util.decode64(keys.Vendor.Exponent),
  forge.util.decode64(keys.Vendor.D),
  forge.util.decode64(keys.Vendor.P),
  forge.util.decode64(keys.Vendor.Q),
  forge.util.decode64(keys.Vendor.DP),
  forge.util.decode64(keys.Vendor.DQ),
  forge.util.decode64(keys.Vendor. InverseQ)
).decrypt

var rsa = forge.rsa;
var decode64 = forge.util.decode64;
var bytesToHex = forge.util.bytesToHex;
var BigInteger = forge.jsbn.BigInteger;

forge.rsa.setPrivateKey(
 new BigInteger(bytesToHex(decode64(keys.Vendor.Modulus))),
 new BigInteger(bytesToHex(decode64(keys.Vendor.Exponent))),
 new BigInteger(bytesToHex(decode64(keys.Vendor.D))),
 new BigInteger(bytesToHex(decode64(keys.Vendor.P))),
 new BigInteger(bytesToHex(decode64(keys.Vendor.Q))),
 new BigInteger(bytesToHex(decode64(keys.Vendor.DP))),
 new BigInteger(bytesToHex(decode64(keys.Vendor.DQ))),
  new BigInteger(bytesToHex(decode64(keys.Vendor.InverseQ)))
)
.decrypt(decode64('yaJKEKWBeZYOlyb5KK2qGqlhWbobq6tIhjpa0bj3qXcElNsoadak88THPoYBVP7gASg0tITEhQSPE55p4GpbQbZqcmmtfCrM0JFdlG3kjbeAqLeHO0QKaN0LOgiZkXY+T86gPdMkE8YHbdGSU+JT5+b8ru22wdNYTDFv5u1iZsQ='), 'RSA-OAEP')

*/
;
