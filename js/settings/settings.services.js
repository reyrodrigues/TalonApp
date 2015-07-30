/*global forge*/
angular.module('talon.settings')
    .service('$settings', function ($timeout, $q, $cordovaFile, httpUtils, keyDB, cardLoadDB, $localStorage,
        $http, $ionicPlatform, talonRoot) {
        return {
            hashApplication: hashApplication,
            sync: Sync
        };

        function hashApplication() {
            var applicationDir = cordova.file.applicationDirectory;
            var logError = function (error) {
                console.log(error);
            }
            return $q.all({
                'index.html': $cordovaFile.readAsDataURL(applicationDir + "www/", 'index.html').then(function (index) {
                    var md = forge.md.md5.create();
                    md.update(index);
                    return md.digest().toHex()
                }).catch(function (error) {
                    logError(error);
                    return "";
                }),
                'app.js': $cordovaFile.readAsDataURL(applicationDir + "www/js/", 'app.js').then(function (appDotJs) {
                    var md = forge.md.md5.create();
                    md.update(appDotJs);
                    return md.digest().toHex()
                }).catch(function (error) {
                    logError(error);
                    return "";
                })
            });
        }


        function Sync() {
            var def = $q.defer();
            httpUtils.checkConnectivity().then(function () {
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

    });

;
