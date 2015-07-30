angular.module('talon.nfc')
    .service('$nfcTools', function ($timeout, $q) {

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

        // Read just the Id
        function readId() {
            return nfcTools.acr35ReadIdFromTag().then(function (id) {
                return id;
            });
        }

        // Write data into card
        function writeData(dataHex) {
            return nfcTools.acr35WriteDataIntoTag(dataHex);
        }
    });

;
