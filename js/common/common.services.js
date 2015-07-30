angular.module('talon.common')
    .service('pouchDBUtils', function (pouchDBDecorators) {
        return {
            updatePouchDB: updatePouchDB,
            index: index
        };

        function index(db, fields) {
            if (fields.constructor !== Array) {
                fields = [fields];
            }
            db.createIndex({
                index: {
                    fields: fields
                }
            });
        }

        function updatePouchDB(db) {
            // Update plugin methods to use $q

            db.find = pouchDBDecorators.qify(db.find);
            db.upsert = pouchDBDecorators.qify(db.upsert);
            db.putIfNotExists = pouchDBDecorators.qify(db.putIfNotExists);
            db.createIndex = pouchDBDecorators.qify(db.createIndex);
        }
    })
    .service('httpUtils', function ($q, $http, talonRoot) {
        return {
            checkConnectivity: checkConnectivity
        };

        function checkConnectivity() {
            var def = $q.defer();
            $http.get(talonRoot + 'api/App/MobileClient/IsAlive').then(function (r) {
                if (r.status !== 200) {
                    def.reject();
                } else {
                    def.resolve();
                }
            }).catch(def.reject.bind(def));

            return def.promise;
        }
    })
    .service('encryption', function ($localStorage) {
        return {
            encrypt: encrypt,
            decrypt: decrypt,
            encryptRsaData: encryptRsaData,
            decryptRsaData: decryptRsaData,
        };

        function encrypt(dataString, pin, key) {
            var cipher = forge.cipher.createCipher('AES-CBC', forge.util.createBuffer(forge.util.decode64(key), 'raw'));
            cipher.start({
                iv: forge.util.createBuffer(pin, 'utf8')
            });
            cipher.update(forge.util.createBuffer(forge.util.createBuffer(dataString, 'utf8')));
            cipher.finish();
            var encrypted = cipher.output;
            return forge.util.encode64(encrypted.bytes());
        }

        function decrypt(dataBytes, pin, key) {
            var decipher = forge.cipher.createDecipher('AES-CBC', forge.util.createBuffer(forge.util.decode64(key), 'raw'));
            decipher.start({
                iv: forge.util.createBuffer(pin, 'utf8')
            });
            decipher.update(forge.util.createBuffer(dataBytes, 'raw'));
            decipher.finish();

            if (decipher.output.toHex().indexOf('31393333') == 0) {
                return decipher.output.toString();
            } else {
                return null;
            }
        }

        function decryptRsaData(data64) {
            // The vendor has their own private key
            var keyPEM = $localStorage.keyset.Vendor;
            var privateKey = forge.pki.privateKeyFromPem(keyPEM);

            // the data is AES-CBC encrypted but the key and IV are RSA'd
            var payload = data64.split('|');
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

        function encryptRsaData(dataString) {
            var key = forge.random.getBytesSync(16);
            var iv = forge.random.getBytesSync(16);
            var bytes = forge.util.createBuffer(dataString, 'utf8');

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
    });
