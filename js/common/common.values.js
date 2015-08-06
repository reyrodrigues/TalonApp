angular.module('talon.common')
    .service('baseDB', function ($q, $localStorage) {
        return BaseDB;

        function BaseDB(name) {
            var internalName = 'DB_' + name;

            this.find = function (selector) {
                var def = $q.defer();
                var filtered = $localStorage[internalName] || [];

                if (selector) {
                    filtered = filtered.filter(selector);
                }

                def.resolve(filtered);

                return def.promise;
            };


            this.replace = function (col) {
             $localStorage[internalName] = col || [];

                var def = $q.defer();
                def.resolve(col)
                return def.promise;
            }

            this.upsert = function (_id, obj) {
                var def = $q.defer();
                var filtered = $localStorage[internalName] || [];

                filtered = filtered.filter(function (o) {
                    return o._id != _id;
                })
                filtered.push(obj);
                $localStorage[internalName] = filtered;


                def.resolve(obj);

                return def.promise;
            }
        }
    })
    .service('keyDB', function (pouchDB, pouchDBUtils, baseDB) {
        var db = new baseDB('keyDB');
        return db;
    })
    .service('cardLoadDB', function (pouchDB, pouchDBUtils, baseDB) {
        var db = new baseDB('cardLoadDB');
        return db;
    })
    .service('qrCodeDB', function (pouchDB, pouchDBUtils, baseDB) {
        var db = new baseDB('qrCodeDB');
        return db;
    })
    .service('cardLoadHistoryDB', function (pouchDB, pouchDBUtils, baseDB) {
        var db = new baseDB('cardLoadHistoryDB');
        return db;
    })
    .service('transactionHistoryDB', function (pouchDB, pouchDBUtils, baseDB) {
        var db = new baseDB('transactionHistoryDB');
        return db;
    })

;
