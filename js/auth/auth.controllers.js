angular.module('talon.auth')
    .controller('LoginController', function LoginController($scope, $ionicHistory, $state, $rootScope, $localStorage, vendorAuthentication, adminAuthentication) {
        $scope.loginData = {};
        $scope.wrongPassword = false;

        $scope.loginAdmin = function LoginAdmin() {
            adminAuthentication.login($scope.loginData.username, $scope.loginData.password).then(function () {
                    $rootScope.authorizationData = $localStorage.authorizationData;
                    adminAuthentication.loadUserData().then(function () {
                        $scope.deferred.resolve();
                        $scope.modal.hide();
                        $scope.wrongPassword = false;
                        $scope.loginData = {};
                    });
                })
                .catch(function () {
                    $scope.wrongPassword = true;
                });
        };

        $scope.loginVendor = function LoginVendor() {
            vendorAuthentication.login($scope.loginData.username, $scope.loginData.password).then(function () {
                    $scope.deferred.resolve();
                    $scope.modal.hide();
                    $scope.wrongPassword = false;
                    $scope.loginData = {};
                    $rootScope.authorizationData = $localStorage.authorizationData;

                })
                .catch(function () {
                    $scope.wrongPassword = true;
                });
        }
    })

;
