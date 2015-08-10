/*global forge, moment */
angular.module('talon.settings')
    .service('$settings', function ($timeout, $q, $cordovaFile, httpUtils, $localStorage,
        $http, $ionicPlatform, talonRoot, $rootScope, $cordovaNetwork, $cordovaDevice,
        keyDB, cardLoadDB, qrCodeDB, cardLoadHistoryDB, transactionHistoryDB, encryption) {
        return {
            hashApplication: hashApplication,
            sync: Sync
        };

        function hashApplication() {
            if (DEBUG) {
                return $q.when({});
            }

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
                }),
                'templates.js': $cordovaFile.readAsDataURL(applicationDir + "www/js/", 'templates.js').then(function (templates) {
                    var md = forge.md.md5.create();
                    md.update(templates);
                    return md.digest().toHex()
                }).catch(function (error) {
                    logError(error);
                    return "";
                })
            });
        }


        function Sync() {
            var successFunction = function () {
                $rootScope.lastSynced = moment().locale('en-US').format('LL');
                return true;
            }

            var def = $q.defer();
            var isOnline = true;
            if (DEBUG) {
                isOnline = true;
            } else {
                isOnline = $cordovaNetwork.isOnline();
            }

            $q.when(isOnline)
                .then(httpUtils.checkConnectivity())
                .then(function () {
                    $q.all([$http.get(talonRoot + 'api/App/MobileClient/DownloadKeyset'), LoadKeys(), LoadQRCodes(), LoadCardLoads()])
                        .then(function (promises) {
                            var keyset = promises[0];
                            $localStorage.keyset = keyset.data;
                            successFunction();
                            def.resolve();
                        })
                        .catch(def.resolve.bind(def));
                }).catch(function () {
                    LoadPayloadFromNetwork().then(successFunction).then(def.resolve.bind(def));
                })

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
            return keyDB.replace(data);
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
            return cardLoadDB.replace(data);
        }

        // QR Load
        function LoadQRCodes() {
            console.log('Internet');
            return $http.get(talonRoot + 'api/App/MobileClient/GenerateQRCodes')
                .then(function (r) {
                    return LoadQRCodesInternal(r.data);
                });
        }

        function LoadQRCodesInternal(data) {
            return qrCodeDB.replace(data);
        }

function UploadPayloadToNetwork(argument) {
    var def = $q.defer();
    if (DEBUG) {
        if (!window.cordova) {
            def.resolve();
        }
    }
}

        function LoadPayloadFromNetwork() {
            var def = $q.defer();
            if (DEBUG) {
                if (!window.cordova) {
                    def.resolve();
                }
            }
            var uuid = $cordovaDevice.getUUID();

            $ionicPlatform.ready(function () {
                var uri = encodeURI("http://10.10.10.254/data/UsbDisk1/Volume1/Talon/" + $localStorage.country.IsoAlpha3 + ".zip");
                var uploadURI = encodeURI("http://10.10.10.254/data/UsbDisk1/Volume1/Talon/" + uuid + ".zip");

                var localDirUri = cordova.file.tempDirectory || cordova.file.cacheDirectory;
                var logError = function (error) {
                    console.log(error);
                    def.reject();
                }


                $cordovaFile.createFile(localDirUri, 'load.zip', true).then(function (fileEntry) {
                    $cordovaFileTransfer.download(uri, fileEntry.toURL())
                        .then(function (entry) {
                            $cordovaFile.readAsArrayBuffer(localDirUri, 'load.zip')
                                .then(function (file) {
                                    var zip = new JSZip(file);
                                    var qrCodes = encryption.decryptRsaData(zip.file("QRCodes.b64").asText());
                                    var cardLoads = encryption.decryptRsaData(zip.file("CardLoads.b64").asText());
                                    var beneficiaryKeys = encryption.decryptRsaData(zip.file("BeneficiaryKeys.b64").asText());
                                    $q.all([
                                            LoadCardLoadsInternal(JSON.parse(cardLoads)),
                                            LoadQRCodesInternal(JSON.parse(qrCodes)),
                                            LoadKeysInternal(JSON.parse(beneficiaryKeys))
                                        ])
                                        .then(function () {
                                            $cordovaFile.removeFile(localDirUri, 'load.zip').then(function () {
                                                console.log('Loaded from wifi storage');

                                                def.resolve();
                                            });
                                        }).catch(logError);
                                }).catch(logError);
                        }).catch(logError)
                });

            });

            return def.promise;
        }
    });

;
