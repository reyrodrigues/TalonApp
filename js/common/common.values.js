angular.module('talon.common')
    .service('keyDB', function (pouchDB, pouchDBUtils) {
        var db = pouchDB('keyStore', {
            adapter: 'websql'
        });

        pouchDBUtils.index(db, 'CardId');
        pouchDBUtils.index(db, 'BeneficiaryId');
        pouchDBUtils.updatePouchDB(db);

        return db;
    })
    .service('cardLoadDB', function (pouchDB, pouchDBUtils) {
        var db = pouchDB('cardLoadStore', {
            adapter: 'websql'
        });

        pouchDBUtils.index(db, 'CardId');
        pouchDBUtils.updatePouchDB(db);

        return db;
    })
    .service('cardLoadHistoryDB', function (pouchDB, pouchDBUtils) {
        var db = pouchDB('cardLoadHistoryStore', {
            adapter: 'websql'
        });

        pouchDBUtils.updatePouchDB(db);

        return db;
    })
    .service('transactionHistoryDB', function (pouchDB, pouchDBUtils) {
        var db = pouchDB('transactionHistoryStore', {
            adapter: 'websql'
        });

        pouchDBUtils.index(db, 'CardId');
        pouchDBUtils.index(db, 'BeneficiaryId');
        pouchDBUtils.index(db, 'TransactionCode');
        pouchDBUtils.updatePouchDB(db);

        return db;
    })

;
