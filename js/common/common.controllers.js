angular.module('talon.common')

.controller('SignaturePadController', function ($scope) {
    $scope.closeDialog = function closeDialog() {
        $scope.modal.hide();
        $scope.isOpen = false;

        if (window.screen && window.screen.lockOrientation) {
            screen.lockOrientation('portrait');
        }
    };
    $scope.accepted = function accepted(signed) {
        $scope.modal.hide();
        $scope.isOpen = false;

        if (window.screen && window.screen.lockOrientation) {
            screen.lockOrientation('portrait');
        }
    };
});
