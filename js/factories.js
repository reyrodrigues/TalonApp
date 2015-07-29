angular
    .module('talon.factories', [
        'ngStorage',
        'ngCordova',
        'talon.services'
    ])

.factory('deviceIdIntereceptor', ['$q', '$injector', '$cordovaDevice', '$localStorage', function AuthInterceptor($q, $injector, $cordovaDevice, $localStorage) {
    // Adding the UUID to the requrests for authentication purposes
    // Token auth should be used as well

    var deviceIdIntereceptorFactory = {};

    var _request = function (config) {

        config.headers = config.headers || {};
        var uuid = window.device ? $cordovaDevice.getUUID() : "UNKNOWN";

        if (uuid) {
            config.headers.DevideUUID = uuid;
        }

        return config;
    };

    var _responseError = function (rejection) {
        return $q.reject(rejection);
    };

    deviceIdIntereceptorFactory.request = _request;
    deviceIdIntereceptorFactory.responseError = _responseError;

    return deviceIdIntereceptorFactory;
}])


.factory('authInterceptor', ['$q', '$injector', '$location', '$localStorage', function AuthInterceptor($q, $injector, $location, $localStorage, $rootScope) {

    var authInterceptorServiceFactory = {};

    var _request = function (config) {

        config.headers = config.headers || {};

        var authData = $localStorage.authorizationData;
        if (authData) {
            config.headers.Authorization = ($localStorage.authorizationData.tokenType == 1 ? 'Token ' : 'Bearer ') + authData.token;
        }
        if ($localStorage.currentUser) {
            if ($localStorage.authorizationData && $localStorage.authorizationData.tokenType == 2) {
                if ($localStorage.currentUser.Organization) {
                    var organizationId = $localStorage.currentUser.Organization.Id;
                    config.headers['X-Tenant-Organization'] = organizationId;

                }
            }

            if ($localStorage.authorizationData && $localStorage.authorizationData.tokenType == 1) {
                var vendorId = $localStorage.currentUser.Id;
            }


            if ($localStorage.country) {
                var countryId = $localStorage.country.Id;
                config.headers['X-Tenant-Country'] = countryId;
            }

        }

        return config;
    };

    var _responseError = function (rejection) {
        if (rejection.status === 401) {
        }
        return $q.reject(rejection);
    };

    authInterceptorServiceFactory.request = _request;
    authInterceptorServiceFactory.responseError = _responseError;

    return authInterceptorServiceFactory;
}]);
