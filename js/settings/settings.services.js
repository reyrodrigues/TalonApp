/*global forge, moment */
angular.module('talon.settings')
    .service('$settings', function ($timeout, $q, $cordovaFile, httpUtils, $localStorage,
        $http, $ionicPlatform, talonRoot, $rootScope, $cordovaNetwork, $cordovaDevice, $cordovaFileTransfer,
        keyDB, cardLoadDB, qrCodeDB, cardLoadHistoryDB, transactionHistoryDB, encryption, $injector) {
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
            return $q.all([
                    $cordovaFile.readAsDataURL(applicationDir + "www/", 'index.html').then(function (index) {
                        var md = forge.md.md5.create();
                        md.update(index);
                        return md.digest().toHex();
                    }).catch(function (error) {
                        logError(error);
                        return "";
                    }),

                    $cordovaFile.readAsDataURL(applicationDir + "www/js/", 'app.js').then(function (appDotJs) {
                        var md = forge.md.md5.create();
                        md.update(appDotJs);
                        return md.digest().toHex();
                    }).catch(function (error) {
                        logError(error);
                        return "";
                    }),

                    $cordovaFile.readAsDataURL(applicationDir + "www/js/", 'templates.js').then(function (templates) {
                        var md = forge.md.md5.create();
                        md.update(templates);
                        return md.digest().toHex();
                    }).catch(function (error) {
                        logError(error);
                        return "";
                    })
                ])
                .then(function (checksums) {
                    var md = forge.md.md5.create();
                    md.update(checksums[0]);
                    md.update(checksums[1]);
                    md.update(checksums[2]);
                    return md.digest().toHex();
                });

        }

        function Sync() {
            var successFunction = function () {
                $rootScope.lastSynced = moment().locale('en-US').format('LLL');
                return true;
            }

            var def = $q.defer();

            httpUtils.checkConnectivity().then(function () {
                $q.all([$http.get(talonRoot + 'api/App/MobileClient/DownloadKeyset'), LoadKeys(), LoadQRCodes(), LoadCardLoads(), UploadStoredData()])
                    .then(function (promises) {
                        var keyset = promises[0];
                        $localStorage.keyset = keyset.data;
                        successFunction();
                        def.resolve();
                    })
                    .catch(def.resolve.bind(def));

            }).catch(function () {
                LoadPayloadFromNetwork().then(UploadPayloadToNetwork).then(successFunction).then(def.resolve.bind(def));
            });

            return def.promise;
        }



        function UploadStoredData() {
            var cardLoads = cardLoadHistoryDB.all();
            var transactions = transactionHistoryDB.all();

            return $q.all([
                $http.post(talonRoot + 'api/App/MobileClient/UploadCardLoads', cardLoads),
                $http.post(talonRoot + 'api/App/MobileClient/UploadTransactions', transactions),
            ]).then(function () {
                cardLoadHistoryDB.replace();
                transactionHistoryDB.replace();
            });
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
            if (DEBUG) {
                var def = $q.defer();
                def.resolve();
                return def;
            }

            var logError = function (error) {
                console.log(error);
                throw error;
            }


            var zip = new JSZip();
            zip.file("cardLoadHistoryDB.b64", encryption.encryptRsaData(JSON.stringify(cardLoadHistoryDB.all())));
            zip.file("transactionHistoryDB.b64", encryption.encryptRsaData(JSON.stringify(transactionHistoryDB.all())));
            zip.file("vendorProfile.b64", encryption.encryptRsaData(JSON.stringify($localStorage.currentUser)));


            var payload = zip.generate({
                type: "blob"
            });

            var localDirUri = cordova.file.tempDirectory || cordova.file.cacheDirectory;
            return $cordovaFile.createFile(localDirUri, 'upload.zip', true).then(function (fileEntry) {
                return $cordovaFile.writeFile(localDirUri, 'upload.zip', payload, true).then(function () {
                    return uploadToFileHub(fileEntry, payload).catch(logError);
                }).catch(logError);
            }).catch(logError);

            function uploadToFileHub(fileEntry, payload) {
                var promise = $q.defer();

                var uuid = $cordovaDevice.getUUID();
                var uploadURI = encodeURI("http://10.10.10.254/data/UsbDisk1/Volume1/Talon/" + uuid + ".zip");

                cordovaHTTP.uploadFile(uploadURI, {}, {
                    'Authorization': 'Basic ' + forge.util.encode64('admin:'),
                    'Content-Type': null,
                }, fileEntry.toURL(), "file", function (response) {
                    $timeout(function () {
                        promise.resolve();

                    });
                }, function (response) {
                    $timeout(function () {
                        promise.reject();
                    });
                });

                return promise.promise;
            }
        }

        function LoadPayloadFromNetwork() {
            if (DEBUG) {
                var def = $q.defer();
                def.resolve();
                return def;
            }

            var localDirUri = cordova.file.tempDirectory || cordova.file.cacheDirectory;

            var logError = function (error) {
                console.log(error);
                throw error;
            }


            return $cordovaFile.createFile(localDirUri, 'load.zip', true).then(function (fileEntry) {
                return downloadFromFileHub(fileEntry).then(function (entry) {
                    return $cordovaFile.readAsArrayBuffer(localDirUri, 'load.zip')
                        .then(function (file) {
                            var zip = new JSZip(file);
                            var qrCodes = encryption.decryptRsaData(zip.file("QRCodes.b64").asText());
                            var cardLoads = encryption.decryptRsaData(zip.file("CardLoads.b64").asText());
                            var beneficiaryKeys = encryption.decryptRsaData(zip.file("BeneficiaryKeys.b64").asText());

                            return $q.all([
                                    LoadCardLoadsInternal(JSON.parse(cardLoads)),
                                    LoadQRCodesInternal(JSON.parse(qrCodes)),
                                    LoadKeysInternal(JSON.parse(beneficiaryKeys))
                                ])
                                .then(function () {
                                    return $cordovaFile.removeFile(localDirUri, 'load.zip').then(function () {
                                        console.log('Loaded from wifi storage');

                                    });
                                }).catch(logError);
                        }).catch(logError);
                }).catch(logError);
            }).catch(logError);


            function downloadFromFileHub(fileEntry) {
                var uri = encodeURI("http://10.10.10.254/data/UsbDisk1/Volume1/Talon/" + $localStorage.country.IsoAlpha3 + ".zip");

                console.log(uri);

                return $cordovaFileTransfer.download(uri, fileEntry.toURL())
                    .catch(logError)

            }
        }
    });

;
