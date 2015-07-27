angular.module('talon.services', [
        'ngStorage',
        'talon.constants',
        'pouchdb',
        'cordovaHTTP'
    ])
    .service('beneficiaryData', function beneficiaryData($http, $localStorage, pouchDB, pouchDBDecorators, $q, talonRoot, $nfcTools, $ionicPlatform) {
        var keyDB = pouchDB('keyStore', {
            adapter: 'websql'
        });
        keyDB.find = pouchDBDecorators.qify(keyDB.find);
        keyDB.upsert = pouchDBDecorators.qify(keyDB.upsert);
        keyDB.putIfNotExists = pouchDBDecorators.qify(keyDB.putIfNotExists);
        keyDB.createIndex = pouchDBDecorators.qify(keyDB.createIndex);
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

        var cardLoadDB = pouchDB('cardLoadStore', {
            adapter: 'websql'
        });
        cardLoadDB.find = pouchDBDecorators.qify(cardLoadDB.find);
        cardLoadDB.upsert = pouchDBDecorators.qify(cardLoadDB.upsert);
        cardLoadDB.putIfNotExists = pouchDBDecorators.qify(cardLoadDB.putIfNotExists);
        cardLoadDB.createIndex = pouchDBDecorators.qify(cardLoadDB.createIndex);


        return {
            loadKeys: LoadKeys,
            loadKeysFromLocalNetwork: LoadKeysFromLocalNetwork,

            loadCardLoads: LoadCardLoads,
            loadCardLoadsFromLocalNetwork: LoadCardLoadsFromLocalNetwork,

            updateCard: UpdateCard,
            readCard: ReadCard,

            provisionBeneficiary: ProvisionBeneficiary,
            fetchBeneficiary: FetchBeneficiary
        };

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
                    $http.post(talonRoot + 'api/App/Administration/ProvisionBeneficiary', {
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

                        $http.get(talonRoot + 'api/App/Administration/GenerateInitialLoad?beneficiaryId=' + key.BeneficiaryId).then(function (res) {
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

        // Key Data
        function LoadKeys() {
            var def = $q.defer();
            $http.get(talonRoot + 'api/App/Administration/IsAlive').then(function () {
                LoadKeysFromInternet().then(function () {
                    def.resolve.apply(def, arguments);
                });
            }).catch(function () {
                LoadKeysFromLocalNetwork().then(function () {
                    def.resolve.apply(def, arguments);
                });
            });

            return def.promise;
        }

        function LoadKeysFromInternet() {
            console.log('Internet');

            return $http.get(talonRoot + 'api/App/Administration/DownloadBeneficiaryKeys').then(function (k) {
                return $q.all(k.data.map(function (key) {
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
            });
        }

        function LoadKeysFromLocalNetwork() {
            console.log('Network');

            var def = $q.defer();
            def.resolve({});
            return def.promise;
        }
        // Card Load

        function LoadCardLoads() {
            var def = $q.defer();
            $http.get(talonRoot + 'api/App/Administration/IsAlive').then(function () {
                LoadCardLoadsFromInternet().then(function () {
                    def.resolve.apply(def, arguments);
                });
            }).catch(function () {
                LoadCardLoadsFromLocalNetwork().then(function () {
                    def.resolve.apply(def, arguments);
                });
            });

            return def.promise;
        }

        function LoadCardLoadsFromInternet() {
            console.log('Internet');
            return $http.get(talonRoot + 'api/App/Administration/GenerateCardLoads')
                .then(function (r) {

                    return $q.all(r.data.map(function (load) {
                        return cardLoadDB.upsert(load._id, function (d) {
                            return {
                                CardId: load.CardId,
                                Load: load.Load
                            };
                        }).then(function () {
                            return load;
                        });
                    }));

                });
        }

        function LoadCardLoadsFromLocalNetwork() {
            console.log('Network');

            var def = $q.defer();
            def.resolve({});
            return def.promise;
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
            }
        };

        return nfcTools;
    })
    .service('vendorAuthentication', function ($http, $q, talonRoot, $cordovaDevice, $localStorage, $rootScope) {
        var vendorAuthServiceFactory = {
            login: function (userName, password) {
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

                            deferred.resolve($localStorage.authorizationData);
                        } else {
                            deferred.reject(response.data);
                        }
                    })
                    .catch(function (err, status) {
                        deferred.reject(err);
                    })

                return deferred.promise;
            }
        };

        return vendorAuthServiceFactory;
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
            $http.get(serviceRoot + 'api/Account/Me')
                .then(function (response) {
                    $rootScope.currentUser = response.data;

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

            return deferred.promise;
        }
    })



;

if (!window.cordova) {
    angular.module('cordovaHTTP', []);
}
/*

var data = r.data.map(function(d) {
 if (!decrypted)
  throw new Error();

 var values = decrypted.split('|');
 console.log(values);
 return [parseFloat(values[1], 10), moment.unix(parseInt(values[2], 16))];
});

if (!since) {
 since = moment('2001-01-01')
} else {
 since = moment(since);
}

var load = data
 .filter(function(d) {
  return d[1] > since;
 })
 .reduce(function(a, b) {
  // Sum first item
  // Get largest of the second
  return [a[0] + b[0], a[1] > b[1] ? a[1] : b[1]];
 }, [0, 0]);

 */
