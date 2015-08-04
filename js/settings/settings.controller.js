angular.module('talon.settings')
    .controller('SyncController', function SyncController($scope, $localStorage, $settings) {

        $scope.setupVendor = function () {
            $settings.sync().then(function () {
                $scope.$broadcast('scroll.refreshComplete');
            });
        };
    })
    .controller('SettingsController', function SettingsController($scope, $localStorage, $rootScope, $nfcTools) {
        $scope.country = $rootScope.country;
        $scope.logout = logout;
        $scope.updateCountry = updateCountry;
        $scope.useNDEF = function () {
            $localStorage.useNDEF = true;
        }

        function updateCountry(country) {
            $localStorage.country = country;
            $rootScope.country = country;
        }

        function logout() {
            delete $localStorage.authorizationData;
            $scope.showLoginModal();
        }
    })

;
