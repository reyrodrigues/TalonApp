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
                if (_useNDEF) {
                    return $q.when(true);
                }
                return makePromise(window.nfcTools.acr35WriteDataIntoTag, [data], true);
            },
            acr35ReadDataFromTag: function () {
                console.log('acr35ReadDataFromTag');
                if (_useNDEF) {
                    return $q.when(true);
                }

                return makePromise(window.nfcTools.acr35ReadDataFromTag, [], true);
            },
            acr35ReadIdFromTag: function () {
                console.log('acr35ReadIdFromTag');
                if (_useNDEF) {
                    return $q.when(true);
                }

                return makePromise(window.nfcTools.acr35ReadIdFromTag, [], true);
            },
            acr35GetDeviceStatus: function () {
                console.log('acr35GetDeviceStatus');
                if (_useNDEF) {
                    return $q.when(true);
                }

                return makePromise(window.nfcTools.acr35GetDeviceStatus, [], true);
            },
            acr35GetDeviceId: function () {
                console.log('acr35GetDeviceId');
                if (_useNDEF) {
                    return $q.when(true);
                }

                return makePromise(window.nfcTools.acr35GetDeviceId, [], true);
            }
        };

        return nfcTools;

        // The idea is for these methods to be generic and not depend on the ACR 35

        // Reads all the data and the ID from the card
        function readIdAndData() {
            var _useNDEF = $localStorage.useNDEF || false;

            var def = $q.defer();

            var platform = $cordovaDevice.getPlatform();
            if (platform.toLowerCase() == 'ios') {
                return UseACR35();
            } else if (platform.toLowerCase() == 'android') {
                if (window.nfc && _useNDEF) {
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
                return def.promise;

            }

            function UseNDEF() {
                console.log('Using NDEF');
                var ndef = $q.defer();

                var handler = $rootScope.$on('nfc:foundTag', function (e, tag) {
                    handler();
                    console.log('Found a tag');
                    console.log(tag);
                    var messages = (tag.ndefMessage || []).map(function (m) {
                        m.id = nfc.bytesToString(m.id);
                        m.type = nfc.bytesToString(m.type);
                        m.payload = nfc.bytesToString(m.payload);
                        return m;
                    });


                    if (!messages.length) {
                        ndef.resolve({
                            id: forge.util.bytesToHex(forge.random.getBytes(4)),
                            data: '',
                            atr: null
                        });
                    } else {
                        ndef.resolve({
                            id: messages[0].id,
                            data: messages[0].payload
                        });
                    }
                });

                return ndef.promise;
            }

            function UseACR35() {
                console.log('Using ACR35');
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
            var _useNDEF = $localStorage.useNDEF || false;

            var def = $q.defer();

            var platform = $cordovaDevice.getPlatform();
            if (platform.toLowerCase() == 'ios') {
                return UseACR35();
            } else if (platform.toLowerCase() == 'android') {
                if (window.nfc && _useNDEF) {
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
                return def.promise;

            }

            function UseNDEF() {
                console.log('Using NDEF');
                var ndef = $q.defer();

                var handler = $rootScope.$on('nfc:foundTag', function (e, tag) {
                    handler();
                    console.log('Found a tag');
                    var messages = (tag.ndefMessage || []).map(function (m) {
                        m.id = nfc.bytesToString(m.id);
                        m.type = nfc.bytesToString(m.type);
                        m.payload = nfc.bytesToString(m.payload);
                        return m;
                    });

                    console.log(JSON.stringify(messages));
                    if (!messages.length) {
                        ndef.resolve(forge.util.bytesToHex(forge.random.getBytes(16)));
                    } else {
                        return ndef.resolve(messages[0].id);
                    }
                });
                return ndef.promise;
            }

            function UseACR35() {
                console.log('Using ACR35');
                return nfcTools.acr35ReadIdFromTag().then(function (id) {
                    return id;
                });
            }
        }


        // Write data into card
        function writeData(dataHex, id) {
            var _useNDEF = $localStorage.useNDEF || false;

            var def = $q.defer();

            var platform = $cordovaDevice.getPlatform();
            if (platform.toLowerCase() == 'ios') {
                return UseACR35(dataHex);
            } else if (platform.toLowerCase() == 'android') {
                if (window.nfc && _useNDEF) {
                    window.nfc.enabled(function () {
                        def.resolve(UseNDEF(dataHex, id));
                    }, function () {
                        def.resolve(UseACR35(dataHex));
                    });
                } else {
                    def.resolve(UseACR35(dataHex));
                }
                return def.promise;
            } else if (platform.toLowerCase().indexOf('win') > -1 || platform.toLowerCase().indexOf('wp') > -1) {
                return def.promise;

            }

            function UseNDEF(data, id) {
                console.log('Using NDEF');
                var defn = $q.defer();

                var handler = $rootScope.$on('nfc:foundTag', function (e, tag) {
                    handler();
                    console.log('Writing a tag');
                    console.log(JSON.stringify(tag));
                    var message = [
                        window.ndef.record(window.ndef.TNF_EXTERNAL_TYPE,
                            util.stringToBytes('application/talon'),
                            util.stringToBytes(id),
                            util.stringToBytes(data)
                        )
                    ];

                    nfc.write(message, function () {
                        $timeout(function () {
                            defn.resolve();
                        });
                    });
                });
                return defn.promise;
            }

            function UseACR35(data) {
                console.log('Using ACR35');
                return nfcTools.acr35WriteDataIntoTag(data);
            }

        }
    });

;
