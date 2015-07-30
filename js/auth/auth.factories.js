angular.module('talon.auth')

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
}])

;
