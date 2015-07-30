angular.module('talon.settings')
.controller('SyncController', function SyncController($scope, $localStorage, $settings) {

    $scope.setupVendor = function () {
        $settings.sync();
    };
})
