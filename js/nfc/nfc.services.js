angular.module('talon.nfc')
    .service('$nfcTools', function ($timeout, $q, $cordovaDevice, $rootScope, $localStorage) {

        function makePromise(fn, args, async) {
            var deferred = $q.defer();

            var success = function (response) {
                console.log('success');

                if (async) {
                    $timeout(function () {
                        deferred.resolve(response);
                    });
                } else {
                    deferred.resolve(response);
                }
            };

            var fail = function (response) {
                console.log('fail');
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

        // Function that makes a promise loop continously for a minute.
        // the use case for this is to wait for a minute to be sure somoene
        function makeLoopable(fn, args, timeout) {
            if (!timeout) {
                timeout = 10 * 6000;
            }
            var looping = true;
            $timeout(function () {
                looping = false;
            }, timeout);

            var def = $q.defer();

            return def.promise;

            function Recurse() {
                makePromise(fn, args, true).then(function () {
                    def.resolve.apply(def, arguments);
                }).catch(function () {
                    if (looping) {
                        Recurse();
                    } else {
                        def.reject.appy(def, arguments);
                    }
                })
            }
        }

        var nfcTools = {
            // Generic functions
            readIdAndData: readIdAndData,
            writeData: writeData,
            readId: readId,

            // Provider specific version
            acr35WriteDataIntoTag: function (data) {
                console.log('acr35WriteDataIntoTag');
                return makePromise(window.nfcTools.acr35WriteDataIntoTag, [data], true);
            },
            acr35ReadDataFromTag: function () {
                console.log('acr35ReadDataFromTag');
                return makePromise(window.nfcTools.acr35ReadDataFromTag, [], true);
            },
            acr35ReadIdFromTag: function () {
                console.log('acr35ReadIdFromTag');
                return makePromise(window.nfcTools.acr35ReadIdFromTag, [], true);
            },
            acr35GetDeviceStatus: function () {
                console.log('acr35GetDeviceStatus');
                return makePromise(window.nfcTools.acr35GetDeviceStatus, [], true);
            },
            acr35GetDeviceId: function () {
                console.log('acr35GetDeviceId');
                return makePromise(window.nfcTools.acr35GetDeviceId, [], true);
            }
        };

        return nfcTools;

        // The idea is for these methods to be generic and not depend on the ACR 35

        // Reads all the data and the ID from the card
        function readIdAndData() {
            var def = $q.defer();

            if (DEBUG) {
                def.resolve(UseMock());
                return def.promise;

                function UseMock() {
                    if (!$localStorage.mockCard) {
                        return {
                            id: forge.util.bytesToHex(forge.random.getBytes(16)),
                            data: '',
                            atr: null
                        };
                    } else {
                        return {
                            id: $localStorage.mockCard[1],
                            data: $localStorage.mockCard[0],
                            atr: null
                        };
                    }
                }
            }

            var platform = $cordovaDevice.getPlatform();
            if (platform.toLowerCase() == 'ios') {
                return UseACR35();
            } else if (platform.toLowerCase() == 'android') {
                if (window.nfc) {
                    window.nfc.enabled(function () {
                        def.resolve(UseNDEF());
                    }, function () {
                        def.resolve(UseACR35());
                    });
                } else {
                    def.resolve(UseACR35());
                }
                return def.promise;
            } else if (platform.toLowerCase().indexOf('win') > -1 || platform.toLowerCase().indexOf('wp') > -1) {
                if (window.nfc) {
                    def.resolve(UseNDEF());
                } else {
                    def.resolve(null);
                }
            }

            function UseNDEF() {
                var ndef = $q.defer();

                var handler = $rootScope.$on('nfc:foundTag', function (e, tag) {
                    handler();
                    var messages = (tag.ndefMessage || []).map(function (m) {
                        m.id = nfc.bytesToString(m.id);
                        m.type = nfc.bytesToString(m.type);
                        m.payload = nfc.bytesToString(m.payload);
                        return m;
                    });


                    if (!messages.length) {
                        $timeout(function () {
                            ndef.resolve({
                                id: forge.util.bytesToHex(forge.random.getBytes(16)),
                                data: '',
                                atr: null
                            });
                        });
                    } else {
                        $timeout(function () {
                            ndef.resolve({
                                id: messages[0].id || forge.util.bytesToHex(forge.random.getBytes(16)),
                                data: messages[0].payload
                            });
                        });
                    }
                });

                return ndef.promise;
            }

            function UseACR35() {
                return nfcTools.acr35ReadIdFromTag().then(function (id) {
                    return nfcTools.acr35ReadDataFromTag().then(function (data) {
                        id = id.constructor === Array ? id[0] : id;

                        return {
                            id: id,
                            data: data[0],
                            atr: data[1]
                        };
                    })
                });
            }
        }

        // Read just the Id
        function readId() {
            var def = $q.defer();

            if (DEBUG) {
                def.resolve(UseMock());
                return def.promise;

                function UseMock() {
                    return readIdAndData().then(function (tag) {
                        return tag.id
                    });
                }
            }

            var platform = $cordovaDevice.getPlatform();
            if (platform.toLowerCase() == 'ios') {
                return UseACR35();
            } else if (platform.toLowerCase() == 'android') {
                if (window.nfc) {
                    window.nfc.enabled(function () {
                        def.resolve(UseNDEF());
                    }, function () {
                        def.resolve(UseACR35());
                    });
                } else {
                    def.resolve(UseACR35());
                }
                return def.promise;
            } else if (platform.toLowerCase().indexOf('win') > -1 || platform.toLowerCase().indexOf('wp') > -1) {
                if (window.nfc) {
                    def.resolve(UseNDEF());
                } else {
                    def.resolve(null);
                }
                return def.promise;
            }

            function UseNDEF() {
                return readIdAndData().then(function (tag) {
                    return tag.id
                });
            }

            function UseACR35() {
                return nfcTools.acr35ReadIdFromTag().then(function (id) {
                    id = id.constructor === Array ? id[0] : id;

                    return id;
                });
            }
        }


        // Write data into card
        function writeData(dataHex, id) {
            console.log('Writing data');
            console.log(dataHex);

            var def = $q.defer();

            if (DEBUG) {
                def.resolve(UseMock(dataHex, id));
                return def.promise;

                function UseMock(data, id) {
                    $localStorage.mockCard = [data, id]
                    return true;
                }
            }

            var platform = $cordovaDevice.getPlatform();
            if (platform.toLowerCase() == 'ios') {
                return UseACR35(dataHex);
            } else if (platform.toLowerCase() == 'android') {
                if (window.nfc) {
                    window.nfc.enabled(function () {
                        def.resolve(UseNDEF(dataHex, id));
                    }, function () {
                        def.resolve(UseACR35(dataHex, id));
                    });
                } else {
                    def.resolve(UseACR35(dataHex, id));
                }
                return def.promise;
            } else if (platform.toLowerCase().indexOf('win') > -1 || platform.toLowerCase().indexOf('wp') > -1) {
                if (window.nfc) {
                    def.resolve(UseNDEF(dataHex, id));
                } else {
                    def.resolve(null);
                }
            }

            function UseNDEF(data, id) {
                var defn = $q.defer();

                var handler = $rootScope.$on('nfc:foundTag', function (e, tag) {
                    handler();
                    var message = [
                        window.ndef.record(window.ndef.TNF_EXTERNAL_TYPE,
                            util.stringToBytes('application/talon'),
                            util.stringToBytes(id),
                            util.stringToBytes(data)
                        )
                    ];

                    nfc.write(message, function () {
                        // it should be happening in the same thread up to here,
                        // but the result needs to bubble up back into angular
                        $timeout(function () {
                            defn.resolve();
                        });
                    });
                });
                return defn.promise;
            }

            function UseACR35(data, id) {
                return nfcTools.acr35WriteDataIntoTag(data);
            }
        }
    });

;
