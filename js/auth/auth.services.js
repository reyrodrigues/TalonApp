angular.module('talon.auth')
    .service('adminAuthentication', function AuthService($http, $localStorage, $q, $rootScope, talonRoot, $cordovaDevice) {
        var serviceRoot = talonRoot;
        var device = {};
        if (window.device) {
            device = $cordovaDevice.getDevice();
        } else {
            device.uuid = '00:00:00:00';
        }

        return {
            login: login,
            logOut: logOut,
            loadUserData: loadUserData
        };

        function login(username, password) {
            var data = "grant_type=password&username=" + username + "&password=" + password;
            var deferred = $q.defer();

            $http.post(serviceRoot + 'token', data, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }).success(function (response) {
                $localStorage.authorizationData = {
                    token: response.access_token,
                    userName: username,
                    uuid: device.UUID || device.uuid,
                    tokenType: 2
                };
                deferred.resolve(true);
            }).error(function (err, status) {
                logOut();
                deferred.reject(false);
            });

            return deferred.promise;
        }

        function logOut() {}

        function loadUserData() {
            var deferred = $q.defer();
            if ($localStorage.currentUser) {
                $rootScope.currentUser = $localStorage.currentUser;
                $rootScope.organization = $rootScope.currentUser.Organization;
                var countries = $rootScope.currentUser.Countries.map(function (c) {
                    return c.Country;
                });

                if (!$localStorage.country) {
                    $localStorage.country = countries[0];
                }

                $rootScope.country = $localStorage.country;
                $rootScope.currentLocale = $localStorage.country.LanguageCode || 'en';


                if ($rootScope.currentUser.Countries.length > 1) {
                    $rootScope.availableCountries = countries;
                } else {
                    $rootScope.availableCountries = false;
                }
                deferred.resolve();
            } else {

                $http.get(serviceRoot + 'api/ApplicationUser/Me')
                    .then(function (response) {
                        $rootScope.currentUser = response.data;
                        $localStorage.currentUser = response.data;

                        $rootScope.organization = $rootScope.currentUser.Organization;
                        $localStorage.organization = $rootScope.currentUser.Organization;
                        var countries = $rootScope.currentUser.Countries.map(function (c) {
                            return c.Country;
                        });

                        if (!$localStorage.country) {
                            $localStorage.country = countries[0];
                        }

                        $rootScope.country = $localStorage.country;
                        $rootScope.currentLocale = $localStorage.country.LanguageCode || 'en';

                        if ($rootScope.currentUser.Countries.length > 1) {
                            $rootScope.availableCountries = countries;
                        } else {
                            $rootScope.availableCountries = false;
                        }
                        deferred.resolve();
                    })
                    .catch(function (error) {
                        console.log(error);
                        deferred.reject(error);
                    });
            }

            return deferred.promise;
        }
    })
    .service('vendorAuthentication', function ($http, $q, talonRoot, $cordovaDevice, $localStorage, $rootScope) {
        var vendorAuthServiceFactory = {
            login: login
        };

        return vendorAuthServiceFactory;

        function login(userName, password) {
            var device = {};
            if (window.device) {
                device = $cordovaDevice.getDevice();
            } else {
                device.uuid = '00:00:00:00';
            }

            var payload = {
                UserName: userName,
                Password: password,
                Device: device
            }

            var deferred = $q.defer();

            $http.post(talonRoot + 'api/App/VendorProfile/Login', payload)
                .then(function (response) {
                    if (response.status == 200) {
                        $localStorage.authorizationData = {
                            userName: payload.UserName,
                            token: response.data.token,
                            uuid: device.UUID || device.uuid,
                            tokenType: 1
                        };

                        loadVendorProfile(response.data.id).then(function () {
                            deferred.resolve($localStorage.authorizationData);
                        })
                    } else {
                        deferred.reject(response.data);
                    }
                })
                .catch(function (err, status) {
                    deferred.reject(err);
                })

            return deferred.promise;
        }

        function loadVendorProfile(vendorId) {
            var deferred = $q.defer();
            if ($localStorage.currentUser) {
                $rootScope.currentUser = $localStorage.currentUser;
                $localStorage.country = $rootScope.currentUser.Country;
                $rootScope.country = $localStorage.country;
                $rootScope.currentLocale = $localStorage.country.LanguageCode || 'en';

                deferred.resolve();
            } else {
                $http.get(talonRoot + 'api/App/VendorProfile/LoadProfile')
                    .then(function (response) {
                        $rootScope.currentUser = response.data;
                        $localStorage.currentUser = response.data;

                        if (!$localStorage.country) {
                            $localStorage.country = $rootScope.currentUser.Country;
                        }

                        $rootScope.country = $localStorage.country;
                        $rootScope.currentLocale = $localStorage.country.LanguageCode || 'en';

                        deferred.resolve();
                    })
                    .catch(function (error) {
                        console.log(error);
                        deferred.reject(error);
                    });
            }

            return deferred.promise;
        }

    });
