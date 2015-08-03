angular.module("talon", [ "ionic", "talon.constants", "talon.controllers", "talon.templates", "talon.auth", "talon.beneficiary", "talon.common", "talon.nfc", "talon.transaction" ]).run([ "$ionicPlatform", "$rootScope", "$timeout", function($ionicPlatform, $rootScope, $timeout) {
    $ionicPlatform.ready(function() {
        window.cordova && window.cordova.plugins.Keyboard && cordova.plugins.Keyboard.hideKeyboardAccessoryBar(!0), window.StatusBar && StatusBar.styleLightContent(), window.screen && window.screen.lockOrientation && screen.lockOrientation("portrait"), 
        window.nfc && (window.nfc.addNdefListener(function(event) {
            $timeout(function() {
                $rootScope.$broadcast("nfc:foundTag", event.tag);
            });
        }), window.nfc.addNdefFormatableListener(function(e, tag) {
            console.log("Formatable found");
            var message = [ window.ndef.record(window.ndef.TNF_EXTERNAL_TYPE, util.stringToBytes("application/talon"), util.stringToBytes(forge.util.bytesToHex(forge.random.getBytes(16))), util.stringToBytes("")) ];
            window.nfc.write(message);
        }));
    });
} ]).config([ "$stateProvider", "$urlRouterProvider", "$httpProvider", function($stateProvider, $urlRouterProvider, $httpProvider) {
    $httpProvider.interceptors.push("authInterceptor"), $stateProvider.state("app", {
        url: "/app",
        "abstract": !0,
        templateUrl: "templates/menu.html",
        controller: "AppController"
    }).state("app.pos", {
        url: "/pos",
        views: {
            menuContent: {
                templateUrl: "templates/pos.html"
            }
        }
    }).state("app.beneficiary", {
        url: "/beneficiary",
        views: {
            menuContent: {
                templateUrl: "templates/beneficiary.html"
            }
        }
    }).state("app.list-beneficiaries", {
        url: "/list-beneficiaries",
        views: {
            menuContent: {
                templateUrl: "templates/list-beneficiaries.html"
            }
        }
    }).state("app.view-beneficiary", {
        url: "/view-beneficiary/:id",
        views: {
            menuContent: {
                templateUrl: "templates/view-beneficiary.html"
            }
        }
    }).state("app.receipts", {
        url: "/receipts",
        views: {
            menuContent: {
                templateUrl: "templates/blank.html"
            }
        }
    }).state("app.invoices", {
        url: "/invoices",
        views: {
            menuContent: {
                templateUrl: "templates/blank.html"
            }
        }
    }).state("app.sync", {
        url: "/sync",
        views: {
            menuContent: {
                templateUrl: "templates/sync.html"
            }
        }
    }).state("app.settings", {
        url: "/settings",
        views: {
            menuContent: {
                templateUrl: "templates/settings.html"
            }
        }
    }), $urlRouterProvider.otherwise("/app/pos");
} ]), angular.module("talon.constants", []).constant("talonRoot", "http://57e8bd72.ngrok.io/"), angular.module("talon.controllers", [ "ngStorage", "talon.templates", "talon.auth", "talon.beneficiary", "talon.common", "talon.nfc", "talon.transaction", "ngCordova" ]).controller("AppController", [ "$scope", "beneficiaryData", "$timeout", "$rootScope", "$cordovaGeolocation", "$ionicPlatform", "$nfcTools", "$localStorage", "$ionicModal", "$q", "$cordovaSpinnerDialog", "adminAuthentication", "$nfcTools", "$settings", "$interval", function($scope, beneficiaryData, $timeout, $rootScope, $cordovaGeolocation, $ionicPlatform, $nfcTools, $localStorage, $ionicModal, $q, $cordovaSpinnerDialog, adminAuthentication, $nfcTools, $settings, $interval) {
    function loadDeviceInfo() {}
    function showPinModal() {
        return $scope.pin.deferred = $q.defer(), $scope.pin.passcode = "", $scope.login.modal && $scope.pin.modal.show(), $scope.pin.deferred.promise;
    }
    function showConfirmationModal(data, pin) {
        return $scope.confirmation.deferred = $q.defer(), $scope.confirmation.data = data, $scope.confirmation.pin = pin, $scope.confirmation.modal && $scope.confirmation.modal.show(), 
        $scope.confirmation.deferred.promise;
    }
    function showSignaturePad() {
        return $scope.signature.deferred = $q.defer(), window.screen && screen.lockOrientation && screen.lockOrientation("landscape"), $scope.signature.modal && ($scope.signature.modal.show(), 
        $scope.signature.isOpen = !0), $scope.signature.deferred.promise;
    }
    function showLoginModal() {
        return $scope.login.deferred = $q.defer(), delete $localStorage.authorizationData, delete $rootScope.authorizationData, delete $localStorage.currentUser, delete $rootScope.currentUser, 
        delete $localStorage.organization, delete $rootScope.organization, delete $localStorage.country, delete $rootScope.country, $scope.login.modal && $scope.login.modal.show(), 
        $scope.login.deferred.promise;
    }
    $scope.pin = $scope.$new(), $scope.login = $scope.$new(), $scope.confirmation = $scope.$new(), $scope.signature = $scope.$new(), $rootScope.device = {}, $ionicModal.fromTemplateUrl("templates/login.html", {
        scope: $scope.login,
        focusFirstInput: !0,
        backdropClickToClose: !1,
        hardwareBackButtonClose: !1
    }).then(function(modal) {
        $scope.login.modal = modal;
    }), $ionicModal.fromTemplateUrl("templates/confirmation.html", {
        scope: $scope.confirmation,
        backdropClickToClose: !1
    }).then(function(modal) {
        $scope.confirmation.modal = modal;
    }), $ionicModal.fromTemplateUrl("templates/pin-code.html", {
        scope: $scope.pin
    }).then(function(modal) {
        $scope.pin.modal = modal;
    }), $ionicModal.fromTemplateUrl("templates/signature-pad.html", {
        scope: $scope.signature
    }).then(function(modal) {
        $scope.signature.modal = modal, $scope.signature.isOpen = !1;
    }), $localStorage.authorizationData ? ($rootScope.authorizationData = $localStorage.authorizationData, 2 != $localStorage.authorizationData.tokenType || $rootScope.currentUser || adminAuthentication.loadUserData()) : $scope.login.$watch("modal", function() {
        $scope.login.modal && showLoginModal().then(function() {});
    }), $ionicPlatform.ready(loadDeviceInfo), $rootScope.$on("onResumeCordova", loadDeviceInfo), $ionicPlatform.ready(function() {
        var posOptions = {
            timeout: 1e4,
            enableHighAccuracy: !1
        };
        $cordovaGeolocation.getCurrentPosition(posOptions).then(function(position) {
            $rootScope.currentLocation = position.coords;
        }, function(err) {});
    }), $scope.showPinModal = showPinModal, $scope.showLoginModal = showLoginModal, $scope.showConfirmationModal = showConfirmationModal, $scope.showSignaturePad = showSignaturePad, 
    $interval(function() {
        $settings.sync();
    }, 12e4);
} ]).controller("SettingsController", [ "$scope", "$localStorage", "$rootScope", "$nfcTools", function($scope, $localStorage, $rootScope, $nfcTools) {
    function updateCountry(country) {
        $localStorage.country = country;
    }
    function logout() {
        delete $localStorage.authorizationData, $scope.showLoginModal();
    }
    $scope.country = $rootScope.country, $scope.logout = logout, $scope.updateCountry = updateCountry, $scope.useNDEF = function() {
        $localStorage.useNDEF = !0;
    };
} ]), angular.module("talon.auth", [ "ngStorage", "ngCordova", "talon.constants", "pouchdb" ]), angular.module("talon.auth").controller("LoginController", [ "$scope", "$rootScope", "$localStorage", "vendorAuthentication", "adminAuthentication", function($scope, $rootScope, $localStorage, vendorAuthentication, adminAuthentication) {
    $scope.loginData = {}, $scope.wrongPassword = !1, $scope.loginAdmin = function() {
        adminAuthentication.login($scope.loginData.username, $scope.loginData.password).then(function() {
            $rootScope.authorizationData = $localStorage.authorizationData, adminAuthentication.loadUserData().then(function() {
                $scope.deferred.resolve(), $scope.modal.hide(), $scope.wrongPassword = !1, $scope.loginData = {};
            });
        })["catch"](function() {
            $scope.wrongPassword = !0;
        });
    }, $scope.loginVendor = function() {
        vendorAuthentication.login($scope.loginData.username, $scope.loginData.password).then(function() {
            $scope.deferred.resolve(), $scope.modal.hide(), $scope.wrongPassword = !1, $scope.loginData = {}, $rootScope.authorizationData = $localStorage.authorizationData;
        })["catch"](function() {
            $scope.wrongPassword = !0;
        });
    };
} ]), angular.module("talon.auth").factory("authInterceptor", [ "$q", "$injector", "$location", "$localStorage", function($q, $injector, $location, $localStorage, $rootScope) {
    var authInterceptorServiceFactory = {}, _request = function(config) {
        config.headers = config.headers || {};
        var authData = $localStorage.authorizationData;
        if (authData && (config.headers.Authorization = (1 == $localStorage.authorizationData.tokenType ? "Token " : "Bearer ") + authData.token), $localStorage.currentUser) {
            if ($localStorage.authorizationData && 2 == $localStorage.authorizationData.tokenType && $localStorage.currentUser.Organization) {
                var organizationId = $localStorage.currentUser.Organization.Id;
                config.headers["X-Tenant-Organization"] = organizationId;
            }
            if ($localStorage.authorizationData && 1 == $localStorage.authorizationData.tokenType) {
                $localStorage.currentUser.Id;
            }
            if ($localStorage.country) {
                var countryId = $localStorage.country.Id;
                config.headers["X-Tenant-Country"] = countryId;
            }
        }
        return config;
    }, _responseError = function(rejection) {
        return 401 === rejection.status, $q.reject(rejection);
    };
    return authInterceptorServiceFactory.request = _request, authInterceptorServiceFactory.responseError = _responseError, authInterceptorServiceFactory;
} ]), angular.module("talon.auth").service("adminAuthentication", [ "$http", "$localStorage", "$q", "$rootScope", "talonRoot", "$cordovaDevice", function($http, $localStorage, $q, $rootScope, talonRoot, $cordovaDevice) {
    function login(username, password) {
        var data = "grant_type=password&username=" + username + "&password=" + password, deferred = $q.defer();
        return $http.post(serviceRoot + "token", data, {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        }).success(function(response) {
            $localStorage.authorizationData = {
                token: response.access_token,
                userName: username,
                uuid: device.UUID || device.uuid,
                tokenType: 2
            }, deferred.resolve(!0);
        }).error(function(err, status) {
            logOut(), deferred.reject(!1);
        }), deferred.promise;
    }
    function logOut() {}
    function loadUserData() {
        var deferred = $q.defer();
        if ($localStorage.currentUser) {
            $rootScope.currentUser = $localStorage.currentUser, $rootScope.organization = $rootScope.currentUser.Organization;
            var countries = $rootScope.currentUser.Countries.map(function(c) {
                return c.Country;
            });
            $localStorage.country || ($localStorage.country = countries[0]), $rootScope.country = $localStorage.country, $rootScope.availableCountries = $rootScope.currentUser.Countries.length > 1 ? countries : !1, 
            deferred.resolve();
        } else $http.get(serviceRoot + "api/Account/Me").then(function(response) {
            $rootScope.currentUser = response.data, $localStorage.currentUser = response.data, $rootScope.organization = $rootScope.currentUser.Organization, $localStorage.organization = $rootScope.currentUser.Organization;
            var countries = $rootScope.currentUser.Countries.map(function(c) {
                return c.Country;
            });
            $localStorage.country || ($localStorage.country = countries[0]), $rootScope.country = $localStorage.country, $rootScope.availableCountries = $rootScope.currentUser.Countries.length > 1 ? countries : !1, 
            deferred.resolve();
        })["catch"](function(error) {
            console.log(error), deferred.reject(error);
        });
        return deferred.promise;
    }
    var serviceRoot = talonRoot, device = {};
    return window.device ? device = $cordovaDevice.getDevice() : device.uuid = "00:00:00:00", {
        login: login,
        logOut: logOut,
        loadUserData: loadUserData
    };
} ]).service("vendorAuthentication", [ "$http", "$q", "talonRoot", "$cordovaDevice", "$localStorage", "$rootScope", function($http, $q, talonRoot, $cordovaDevice, $localStorage, $rootScope) {
    function login(userName, password) {
        var device = {};
        window.device ? device = $cordovaDevice.getDevice() : device.uuid = "00:00:00:00";
        var payload = {
            UserName: userName,
            Password: password,
            Device: device
        }, deferred = $q.defer();
        return $http.post(talonRoot + "api/App/VendorProfile/Login", payload).then(function(response) {
            200 == response.status ? ($localStorage.authorizationData = {
                userName: payload.UserName,
                token: response.data.token,
                uuid: device.UUID || device.uuid,
                tokenType: 1
            }, loadVendorProfile(response.data.id).then(function() {
                deferred.resolve($localStorage.authorizationData);
            })) : deferred.reject(response.data);
        })["catch"](function(err, status) {
            deferred.reject(err);
        }), deferred.promise;
    }
    function loadVendorProfile(vendorId) {
        var deferred = $q.defer();
        return $localStorage.currentUser ? ($rootScope.currentUser = $localStorage.currentUser, $localStorage.country || ($localStorage.country = $rootScope.currentUser.Country), 
        $rootScope.country = $localStorage.country, deferred.resolve()) : $http.get(talonRoot + "api/App/VendorProfile/LoadProfile").then(function(response) {
            $rootScope.currentUser = response.data, $localStorage.currentUser = response.data, $localStorage.country || ($localStorage.country = $rootScope.currentUser.Country), 
            $rootScope.country = $localStorage.country, deferred.resolve();
        })["catch"](function(error) {
            console.log(error), deferred.reject(error);
        }), deferred.promise;
    }
    var vendorAuthServiceFactory = {
        login: login
    };
    return vendorAuthServiceFactory;
} ]), angular.module("talon.beneficiary", [ "ngStorage", "ngCordova", "talon.constants", "pouchdb", "talon.nfc", "talon.common" ]), angular.module("talon.beneficiary").controller("BeneficiaryController", [ "$scope", "$localStorage", "$ionicModal", "$cordovaSpinnerDialog", "beneficiaryData", function($scope, $localStorage, $ionicModal, $cordovaSpinnerDialog, beneficiaryData) {
    function reloadCard() {
        var failFunction = function(error) {
            console.log(error), $cordovaSpinnerDialog.hide();
        };
        $scope.showPinModal().then(function(pin) {
            $cordovaSpinnerDialog.show("Reload Card", "Please hold NFC card close to reader", !0), beneficiaryData.reloadCard(pin).then(function() {
                $cordovaSpinnerDialog.hide();
            })["catch"](failFunction);
        })["catch"](failFunction);
    }
    function readCard() {
        var failFunction = function(error) {
            console.log(error), $cordovaSpinnerDialog.hide();
        };
        $scope.showPinModal().then(function(pin) {
            $cordovaSpinnerDialog.show("Read Card", "Please hold NFC card close to reader", !0), beneficiaryData.readCardData(pin).then(function(info) {
                $scope.cardInfo = info, $cordovaSpinnerDialog.hide();
            })["catch"](failFunction);
        })["catch"](failFunction);
    }
    $scope.reloadCard = reloadCard, $scope.readCard = readCard;
} ]).controller("ListBeneficiaryController", [ "$scope", "$localStorage", "$q", "$timeout", "$http", "beneficiaryData", function($scope, $localStorage, $q, $timeout, $http, beneficiaryData) {
    function beneficiariesByName(name) {
        return timeout && $timeout.cancel(timeout), timeout = $timeout(function() {
            beneficiaryData.listBeneficiariesByName(name).then(function(beneficiaries) {
                $scope.beneficiaries = beneficiaries;
            }), timeout = null;
        }, 500);
    }
    $scope.beneficiaries = [], $scope.beneficiariesByName = beneficiariesByName;
    var timeout = null;
} ]).controller("ViewBeneficiaryController", [ "$scope", "$localStorage", "$q", "$timeout", "$http", "$state", "talonRoot", "beneficiaryData", function($scope, $localStorage, $q, $timeout, $http, $state, talonRoot, beneficiaryData) {
    $scope.provisionCard = function() {
        var beneficiaryId = $scope.beneficiary.Id;
        beneficiaryData.provisionBeneficiary(beneficiaryId).then(function() {});
    }, beneficiaryData.fetchBeneficiaryById($state.params.id).then(function(beneficiaries) {
        $scope.beneficiary = beneficiaries;
    });
} ]), angular.module("talon.beneficiary").directive("ionSearch", function() {
    return {
        restrict: "E",
        replace: !0,
        scope: {
            getData: "&source",
            model: "=?",
            search: "=?filter"
        },
        link: function(scope, element, attrs) {
            attrs.minLength = attrs.minLength || 0, scope.placeholder = attrs.placeholder || "", scope.search = {
                value: ""
            }, attrs["class"] && element.addClass(attrs["class"]), attrs.source && scope.$watch("search.value", function(newValue, oldValue) {
                newValue.length > attrs.minLength ? scope.getData({
                    str: newValue
                }).then(function(results) {
                    scope.model = results;
                }) : scope.model = [];
            }), scope.clearSearch = function() {
                scope.search.value = "";
            };
        },
        template: '<div class="item-input-wrapper"><i class="icon ion-android-search"></i><input type="search" placeholder="{{placeholder}}" ng-model="search.value"><i ng-if="search.value.length > 0" ng-click="clearSearch()" class="icon ion-close"></i></div>'
    };
}).directive("signaturePad", [ "$timeout", function($timeout) {
    return {
        restrict: "E",
        scope: {
            model: "=",
            cancelled: "=",
            accepted: "=",
            isOpen: "="
        },
        link: function(scope, element, attrs) {
            scope.acceptSignature = function() {
                scope.accepted && scope.accepted($("#signature-pad", element).jSignature("getData", "svgbase64"));
            }, scope.closeDialog = function() {
                scope.cancelled && scope.cancelled();
            }, scope.clearSignature = function() {
                $("#signature-pad", element).jSignature("reset");
            };
            var created = !1;
            scope.$watch("isOpen", function() {
                scope.isOpen && (created || ($("#signature-pad").jSignature(), created = !0), 0 == $("#signature-pad", element).children().length && $("#signature-pad", element).jSignature("reset"));
            });
        },
        template: '<div id="signature-pad" style="height:60%; overflow: hidden;"></div><div class="row"><div class="col"><button class="button button-assertive button-block" ng-click="closeDialog()">Cancel</button></div><div class="col"><button class="button button-stable button-block" ng-click="clearSignature()">Clear</button></div><div class="col"></div><div class="col"></div><div class="col"><button class="button button-positive button-block" ng-click="acceptSignature()">Accept</button></div></div>'
    };
} ]), angular.module("talon.beneficiary").service("beneficiaryData", [ "$http", "$localStorage", "keyDB", "cardLoadDB", "$q", "talonRoot", "$nfcTools", "$ionicPlatform", "$timeout", "$cordovaFile", "$cordovaFileTransfer", "httpUtils", "encryption", "$state", function($http, $localStorage, keyDB, cardLoadDB, $q, talonRoot, $nfcTools, $ionicPlatform, $timeout, $cordovaFile, $cordovaFileTransfer, httpUtils, encryption, $state) {
    function ProvisionBeneficiary(beneficiaryId, pin) {
        var def = $q.defer();
        return $nfcTools.readId(pin).then(function(id) {
            $http.post(talonRoot + "api/App/MobileClient/ProvisionBeneficiary", {
                beneficiaryId: beneficiaryId,
                cardId: id
            }).then(function(k) {
                var key = k.data;
                keyDB.upsert(key._id, function(d) {
                    return {
                        BeneficiaryId: key.BeneficiaryId,
                        CardId: key.CardId,
                        CardKey: key.CardKey
                    };
                }), $http.get(talonRoot + "api/App/MobileClient/GenerateInitialLoad?beneficiaryId=" + key.BeneficiaryId).then(function(res) {
                    var payload = res.data;
                    payload = forge.util.bytesToHex(forge.util.decode64(payload)), $nfcTools.writeData(payload, key.CardId).then(def.resolve.bind(def));
                });
            });
        })["catch"](function() {
            def.reject();
        }), def.promise;
    }
    function ReadCardData(pin) {
        return $nfcTools.readIdAndData().then(function(cardData) {
            return FetchBeneficiary(cardData.id).then(function(beneficiary) {
                return DecryptCardData(cardData.data, beneficiary.CardKey, pin).then(function(payload) {
                    return {
                        beneficiary: beneficiary,
                        payload: payload
                    };
                });
            });
        });
    }
    function ReloadCard(pin) {
        var def = $q.defer(), failFunction = function(error) {
            console.log(error), def.reject(error);
        };
        return FetchPendingLoads(pin).then(function(pendingLoad) {
            var load = pendingLoad.pending, cardPayload = pendingLoad.card.payload, beneficiary = pendingLoad.card.beneficiary, currentAmount = cardPayload[0];
            if (0 == load[0]) return void def.resolve();
            var payload = "1933|" + (load[0] + currentAmount) + "|" + load[1].unix().toString(16);
            $timeout(function() {
                UpdateCardData(payload, beneficiary.CardKey, pin, beneficiary.CardId).then(function(update) {
                    def.resolve();
                })["catch"](failFunction);
            }, 500);
        })["catch"](failFunction), def.promise;
    }
    function FetchPendingLoads(pin, cardLoad) {
        var def = $q.defer(), failFunction = function(error) {
            console.log(error), def.reject(error);
        }, preloadDef = $q.defer();
        return cardLoad ? preloadDef.resolve(cardLoad) : ReadCardData(pin).then(preloadDef.resolve.bind(preloadDef)), preloadDef.promise.then(function(card) {
            {
                var cardPayload = card.payload, beneficiary = card.beneficiary, since = moment.unix(cardPayload[1]);
                cardPayload[0];
            }
            cardLoadDB.find({
                selector: {
                    CardId: beneficiary.CardId
                }
            }).then(function(res) {
                0 == res.docs.length && def.resolve({
                    pending: [ 0, 0 ],
                    card: card
                });
                var loads = res.docs[0].Load, data = loads.map(function(d) {
                    var encryptedData = forge.util.decode64(d), decrypted = encryption.decrypt(encryptedData, pin, beneficiary.CardKey);
                    if (!decrypted) throw new Error();
                    var values = decrypted.split("|");
                    return [ parseFloat(values[1], 10), moment.unix(parseInt(values[2], 16)) ];
                }), load = data.filter(function(d) {
                    return d[1] > since;
                }).reduce(function(a, b) {
                    return [ a[0] + b[0], a[1] > b[1] ? a[1] : b[1] ];
                }, [ 0, 0 ]);
                def.resolve(0 == load[0] && 0 == load[1] ? {
                    pending: [ 0, 0 ],
                    card: card
                } : {
                    pending: load,
                    card: card
                });
            })["catch"](failFunction);
        })["catch"](failFunction), def.promise;
    }
    function UpdateCardData(data, key, pin, id) {
        var encrypedB64 = encryption.encrypt(data, pin, key), encrypted = forge.util.createBuffer(forge.util.decode64(encrypedB64), "raw").toHex(), def = $q.defer();
        return $nfcTools.writeData(encrypted, id).then(function(result) {
            def.resolve(result);
        }), def.promise;
    }
    function DecryptCardData(cardData, key, pin) {
        var def = $q.defer(), firstIndex = cardData.indexOf("0000");
        firstIndex % 2 == 1 && (firstIndex += 1);
        var dataToZero = firstIndex > -1 ? cardData.substring(0, firstIndex) : cardData, encryptedData = forge.util.hexToBytes(dataToZero), decrypted = encryption.decrypt(encryptedData, pin, key);
        if (!decrypted) return def.reject(), def.promise;
        var values = decrypted.split("|"), currentCard = [ parseFloat(values[1], 10), parseInt(values[2], 16) ];
        return def.resolve(currentCard), def.promise;
    }
    function FetchBeneficiary(id) {
        var def = $q.defer();
        return keyDB.find({
            selector: {
                CardId: id
            }
        }).then(function(s) {
            s.docs.length && def.resolve(s.docs[0]), def.reject();
        }), def.promise;
    }
    function ListBeneficiariesByName(name) {
        var filter = "$filter=startswith(tolower(FirstName), '" + encodeURIComponent(name.toLowerCase()) + "') or startswith(tolower(LastName), '" + encodeURIComponent(name.toLowerCase()) + "')";
        return $http.get(talonRoot + "Breeze/EVM/Beneficiaries?" + filter).then(function(res) {
            return res.data;
        });
    }
    function FetchBeneficiaryById(id) {
        return $http.get(talonRoot + "Breeze/EVM/Beneficiaries?$expand=Location&$filter=Id eq " + $state.params.id).then(function(res) {
            return res.data[0];
        });
    }
    return {
        reloadCard: ReloadCard,
        readCardData: ReadCardData,
        updateCardData: UpdateCardData,
        provisionBeneficiary: ProvisionBeneficiary,
        listBeneficiariesByName: ListBeneficiariesByName,
        fetchBeneficiaryById: FetchBeneficiaryById,
        fetchPendingLoads: FetchPendingLoads
    };
} ]), angular.module("talon.common", [ "ngStorage", "ngCordova", "talon.constants", "pouchdb" ]), window.plugins || (window.plugins = {}), window.plugins.spinnerDialog || (window.plugins.spinnerDialog = {
    show: function() {
        return !0;
    },
    hide: function() {
        return !0;
    }
}), angular.module("talon.common").controller("SignaturePadController", [ "$scope", function($scope) {
    $scope.closeDialog = function() {
        $scope.modal.hide(), $scope.isOpen = !1, window.screen && window.screen.lockOrientation && screen.lockOrientation("portrait");
    }, $scope.accepted = function(signed) {
        $scope.modal.hide(), $scope.isOpen = !1, window.screen && window.screen.lockOrientation && screen.lockOrientation("portrait");
    };
} ]), angular.module("talon.common").service("pouchDBUtils", [ "pouchDBDecorators", function(pouchDBDecorators) {
    function index(db, fields) {
        fields.constructor !== Array && (fields = [ fields ]), db.createIndex({
            index: {
                fields: fields
            }
        });
    }
    function updatePouchDB(db) {
        db.find = pouchDBDecorators.qify(db.find), db.upsert = pouchDBDecorators.qify(db.upsert), db.putIfNotExists = pouchDBDecorators.qify(db.putIfNotExists), db.createIndex = pouchDBDecorators.qify(db.createIndex);
    }
    return {
        updatePouchDB: updatePouchDB,
        index: index
    };
} ]).service("httpUtils", [ "$q", "$http", "talonRoot", function($q, $http, talonRoot) {
    function checkConnectivity() {
        var def = $q.defer();
        return $http.get(talonRoot + "api/App/MobileClient/IsAlive").then(function(r) {
            200 !== r.status ? def.reject() : def.resolve();
        })["catch"](def.reject.bind(def)), def.promise;
    }
    return {
        checkConnectivity: checkConnectivity
    };
} ]).service("encryption", [ "$localStorage", function($localStorage) {
    function encrypt(dataString, pin, key) {
        var cipher = forge.cipher.createCipher("AES-CBC", forge.util.createBuffer(forge.util.decode64(key), "raw"));
        cipher.start({
            iv: forge.util.createBuffer(pin, "utf8")
        }), cipher.update(forge.util.createBuffer(forge.util.createBuffer(dataString, "utf8"))), cipher.finish();
        var encrypted = cipher.output;
        return forge.util.encode64(encrypted.bytes());
    }
    function decrypt(dataBytes, pin, key) {
        var decipher = forge.cipher.createDecipher("AES-CBC", forge.util.createBuffer(forge.util.decode64(key), "raw"));
        return decipher.start({
            iv: forge.util.createBuffer(pin, "utf8")
        }), decipher.update(forge.util.createBuffer(dataBytes, "raw")), decipher.finish(), 0 == decipher.output.toHex().indexOf("31393333") ? decipher.output.toString() : null;
    }
    function decryptRsaData(data64) {
        var keyPEM = $localStorage.keyset.Vendor, privateKey = forge.pki.privateKeyFromPem(keyPEM), payload = data64.split("|"), key = privateKey.decrypt(forge.util.decode64(payload[1]), "RSA-OAEP"), iv = privateKey.decrypt(forge.util.decode64(payload[2]), "RSA-OAEP"), decipher = forge.cipher.createDecipher("AES-CBC", forge.util.createBuffer(key, "raw"));
        return decipher.start({
            iv: forge.util.createBuffer(iv, "raw")
        }), decipher.update(forge.util.createBuffer(forge.util.decode64(payload[0]), "raw")), decipher.finish() ? decipher.output.toString() : null;
    }
    function encryptRsaData(dataString) {
        var key = forge.random.getBytesSync(16), iv = forge.random.getBytesSync(16), bytes = forge.util.createBuffer(dataString, "utf8"), keyPEM = $localStorage.keyset.Server, privateKey = forge.pki.publicKeyFromPem(keyPEM), cipher = forge.cipher.createCipher("AES-CBC", key);
        cipher.start({
            iv: iv
        }), cipher.update(forge.util.createBuffer(bytes)), cipher.finish();
        var encrypted = forge.util.encode64(forge.util.hexToBytes(cipher.output.toHex())), result = [ encrypted, forge.util.encode64(privateKey.encrypt(key, "RSA-OAEP")), forge.util.encode64(privateKey.encrypt(iv, "RSA-OAEP")) ];
        return result.join("|");
    }
    return {
        encrypt: encrypt,
        decrypt: decrypt,
        encryptRsaData: encryptRsaData,
        decryptRsaData: decryptRsaData
    };
} ]), angular.module("talon.common").service("keyDB", [ "pouchDB", "pouchDBUtils", function(pouchDB, pouchDBUtils) {
    var db = pouchDB("keyStore", {
        adapter: "websql"
    });
    return pouchDBUtils.index(db, "CardId"), pouchDBUtils.index(db, "BeneficiaryId"), pouchDBUtils.updatePouchDB(db), db;
} ]).service("cardLoadDB", [ "pouchDB", "pouchDBUtils", function(pouchDB, pouchDBUtils) {
    var db = pouchDB("cardLoadStore", {
        adapter: "websql"
    });
    return pouchDBUtils.index(db, "CardId"), pouchDBUtils.updatePouchDB(db), db;
} ]).service("qrCodeDB", [ "pouchDB", "pouchDBUtils", function(pouchDB, pouchDBUtils) {
    var db = pouchDB("qrCodeStore", {
        adapter: "websql"
    });
    return pouchDBUtils.index(db, "BeneficiaryId"), pouchDBUtils.index(db, "VoucherCode"), pouchDBUtils.updatePouchDB(db), db;
} ]).service("cardLoadHistoryDB", [ "pouchDB", "pouchDBUtils", function(pouchDB, pouchDBUtils) {
    var db = pouchDB("cardLoadHistoryStore", {
        adapter: "websql"
    });
    return pouchDBUtils.updatePouchDB(db), db;
} ]).service("transactionHistoryDB", [ "pouchDB", "pouchDBUtils", function(pouchDB, pouchDBUtils) {
    var db = pouchDB("transactionHistoryStore", {
        adapter: "websql"
    });
    return pouchDBUtils.index(db, "CardId"), pouchDBUtils.index(db, "BeneficiaryId"), pouchDBUtils.index(db, "TransactionCode"), pouchDBUtils.updatePouchDB(db), db;
} ]), angular.module("talon.nfc", [ "ngStorage", "ngCordova", "talon.constants", "pouchdb" ]), angular.module("talon.nfc").service("$nfcTools", [ "$timeout", "$q", "$cordovaDevice", "$rootScope", "$localStorage", function($timeout, $q, $cordovaDevice, $rootScope, $localStorage) {
    function makePromise(fn, args, async) {
        var deferred = $q.defer(), success = function(response) {
            console.log("success"), async ? $timeout(function() {
                deferred.resolve(response);
            }) : deferred.resolve(response);
        }, fail = function(response) {
            console.log("fail"), async ? $timeout(function() {
                deferred.reject(response);
            }) : deferred.reject(response);
        };
        return args.push(success), args.push(fail), fn.apply(window.nfcTools, args), deferred.promise;
    }
    function readIdAndData() {
        function UseMock() {
            return $localStorage.mockCard ? {
                id: $localStorage.mockCard[1],
                data: $localStorage.mockCard[0],
                atr: null
            } : {
                id: forge.util.bytesToHex(forge.random.getBytes(16)),
                data: "",
                atr: null
            };
        }
        function UseNDEF() {
            var ndef = $q.defer(), handler = $rootScope.$on("nfc:foundTag", function(e, tag) {
                handler();
                var messages = (tag.ndefMessage || []).map(function(m) {
                    return m.id = nfc.bytesToString(m.id), m.type = nfc.bytesToString(m.type), m.payload = nfc.bytesToString(m.payload), m;
                });
                ndef.resolve(messages.length ? {
                    id: messages[0].id || forge.util.bytesToHex(forge.random.getBytes(16)),
                    data: messages[0].payload
                } : {
                    id: forge.util.bytesToHex(forge.random.getBytes(16)),
                    data: "",
                    atr: null
                });
            });
            return ndef.promise;
        }
        function UseACR35() {
            return nfcTools.acr35ReadIdFromTag().then(function(id) {
                return nfcTools.acr35ReadDataFromTag().then(function(data) {
                    return id = id.constructor === Array ? id[0] : id, {
                        id: id,
                        data: data[0],
                        atr: data[1]
                    };
                });
            });
        }
        var def = $q.defer();
        if (!window.cordova) return def.resolve(UseMock()), def.promise;
        var platform = $cordovaDevice.getPlatform();
        return "ios" == platform.toLowerCase() ? UseACR35() : "android" == platform.toLowerCase() ? (window.nfc ? window.nfc.enabled(function() {
            def.resolve(UseNDEF());
        }, function() {
            def.resolve(UseACR35());
        }) : def.resolve(UseACR35()), def.promise) : platform.toLowerCase().indexOf("win") > -1 || platform.toLowerCase().indexOf("wp") > -1 ? def.promise : void 0;
    }
    function readId() {
        function UseMock() {
            return readIdAndData().then(function(tag) {
                return tag.id;
            });
        }
        function UseNDEF() {
            return readIdAndData().then(function(tag) {
                return tag.id;
            });
        }
        function UseACR35() {
            return nfcTools.acr35ReadIdFromTag().then(function(id) {
                return id = id.constructor === Array ? id[0] : id;
            });
        }
        var def = $q.defer();
        if (!window.cordova) return def.resolve(UseMock()), def.promise;
        var platform = $cordovaDevice.getPlatform();
        return "ios" == platform.toLowerCase() ? UseACR35() : "android" == platform.toLowerCase() ? (window.nfc ? window.nfc.enabled(function() {
            def.resolve(UseNDEF());
        }, function() {
            def.resolve(UseACR35());
        }) : def.resolve(UseACR35()), def.promise) : platform.toLowerCase().indexOf("win") > -1 || platform.toLowerCase().indexOf("wp") > -1 ? (def.resolve(null), def.promise) : void 0;
    }
    function writeData(dataHex, id) {
        function UseMock(data, id) {
            return $localStorage.mockCard = [ data, id ], !0;
        }
        function UseNDEF(data, id) {
            var defn = $q.defer(), handler = $rootScope.$on("nfc:foundTag", function(e, tag) {
                handler();
                var message = [ window.ndef.record(window.ndef.TNF_EXTERNAL_TYPE, util.stringToBytes("application/talon"), util.stringToBytes(id), util.stringToBytes(data)) ];
                nfc.write(message, function() {
                    $timeout(function() {
                        defn.resolve();
                    });
                });
            });
            return defn.promise;
        }
        function UseACR35(data, id) {
            return nfcTools.acr35WriteDataIntoTag(data);
        }
        var def = $q.defer();
        if (!window.cordova) return def.resolve(UseMock(dataHex, id)), def.promise;
        var platform = $cordovaDevice.getPlatform();
        return "ios" == platform.toLowerCase() ? UseACR35(dataHex) : "android" == platform.toLowerCase() ? (window.nfc ? window.nfc.enabled(function() {
            def.resolve(UseNDEF(dataHex, id));
        }, function() {
            def.resolve(UseACR35(dataHex, id));
        }) : def.resolve(UseACR35(dataHex, id)), def.promise) : platform.toLowerCase().indexOf("win") > -1 || platform.toLowerCase().indexOf("wp") > -1 ? def.promise : void 0;
    }
    var nfcTools = {
        readIdAndData: readIdAndData,
        writeData: writeData,
        readId: readId,
        acr35WriteDataIntoTag: function(data) {
            return console.log("acr35WriteDataIntoTag"), makePromise(window.nfcTools.acr35WriteDataIntoTag, [ data ], !0);
        },
        acr35ReadDataFromTag: function() {
            return console.log("acr35ReadDataFromTag"), makePromise(window.nfcTools.acr35ReadDataFromTag, [], !0);
        },
        acr35ReadIdFromTag: function() {
            return console.log("acr35ReadIdFromTag"), makePromise(window.nfcTools.acr35ReadIdFromTag, [], !0);
        },
        acr35GetDeviceStatus: function() {
            return console.log("acr35GetDeviceStatus"), makePromise(window.nfcTools.acr35GetDeviceStatus, [], !0);
        },
        acr35GetDeviceId: function() {
            return console.log("acr35GetDeviceId"), makePromise(window.nfcTools.acr35GetDeviceId, [], !0);
        }
    };
    return nfcTools;
} ]), angular.module("talon.settings", [ "ngStorage", "ngCordova", "talon.constants", "pouchdb" ]), angular.module("talon.settings").controller("SyncController", [ "$scope", "$localStorage", "$settings", function($scope, $localStorage, $settings) {
    $scope.setupVendor = function() {
        $settings.sync();
    };
} ]), angular.module("talon.settings").service("$settings", [ "$timeout", "$q", "$cordovaFile", "httpUtils", "keyDB", "cardLoadDB", "qrCodeDB", "$localStorage", "$http", "$ionicPlatform", "talonRoot", function($timeout, $q, $cordovaFile, httpUtils, keyDB, cardLoadDB, qrCodeDB, $localStorage, $http, $ionicPlatform, talonRoot) {
    function hashApplication() {
        return $q.when({});
    }
    function Sync() {
        var def = $q.defer();
        httpUtils.checkConnectivity().then(function() {
            $q.all([ $http.get(talonRoot + "api/App/MobileClient/DownloadKeyset"), LoadKeys(), LoadQRCodes(), LoadCardLoads() ]).then(function(promises) {
                var keyset = promises[0];
                $localStorage.keyset = keyset.data, def.resolve();
            })["catch"](def.resolve.bind(def));
        })["catch"](function() {
            LoadPayloadFromNetwork().then(def.resolve.bind(def));
        }), def.promise;
    }
    function LoadKeys() {
        return console.log("Internet"), $http.get(talonRoot + "api/App/MobileClient/DownloadBeneficiaryKeys").then(function(k) {
            return LoadKeysInternal(k.data);
        });
    }
    function LoadKeysInternal(data) {
        return $q.all(data.map(function(key) {
            return keyDB.upsert(key._id, function(d) {
                return {
                    BeneficiaryId: key.BeneficiaryId,
                    CardId: key.CardId,
                    CardKey: key.CardKey
                };
            }).then(function() {
                return key;
            });
        }));
    }
    function LoadCardLoads() {
        return console.log("Internet"), $http.get(talonRoot + "api/App/MobileClient/GenerateCardLoads").then(function(r) {
            return LoadCardLoadsInternal(r.data);
        });
    }
    function LoadCardLoadsInternal(data) {
        return $q.all(data.map(function(load) {
            return cardLoadDB.upsert(load._id, function(d) {
                return {
                    CardId: load.CardId,
                    Load: load.Load
                };
            }).then(function() {
                return load;
            });
        }));
    }
    function LoadQRCodes() {
        return console.log("Internet"), $http.get(talonRoot + "api/App/MobileClient/GenerateQRCodes").then(function(r) {
            return LoadQRCodesInternal(r.data);
        });
    }
    function LoadQRCodesInternal(data) {
        return $q.all(data.map(function(load) {
            return qrCodeDB.upsert(load._id, function(d) {
                return {
                    VoucherCode: load.VoucherCode,
                    BeneficiaryId: load.BeneficiaryId,
                    Payload: load.Payload
                };
            }).then(function() {
                return load;
            });
        }));
    }
    function LoadPayloadFromNetwork() {
        var def = $q.defer();
        return window.cordova || def.resolve(), $ionicPlatform.ready(function() {
            var uri = encodeURI("http://10.10.10.254/data/UsbDisk1/Volume1/Talon/" + $localStorage.country.IsoAlpha3 + ".zip"), localDirUri = cordova.file.tempDirectory || cordova.file.cacheDirectory, logError = function(error) {
                console.log(error), def.reject();
            };
            $cordovaFile.createFile(localDirUri, "load.zip", !0).then(function(fileEntry) {
                $cordovaFileTransfer.download(uri, fileEntry.toURL()).then(function(entry) {
                    $cordovaFile.readAsArrayBuffer(localDirUri, "load.zip").then(function(file) {
                        var zip = new JSZip(file), qrCodes = decryptRsaData(zip.file("QRCodes.b64").asText()), cardLoads = decryptRsaData(zip.file("CardLoads.b64").asText()), beneficiaryKeys = decryptRsaData(zip.file("BeneficiaryKeys.b64").asText());
                        $q.all([ LoadCardLoadsInternal(JSON.parse(cardLoads)), LoadQRCodesInternal(JSON.parse(qrCodes)), LoadKeysInternal(JSON.parse(beneficiaryKeys)) ]).then(function() {
                            $cordovaFile.removeFile(localDirUri, "load.zip").then(function() {
                                console.log("Loaded from wifi storage"), def.resolve();
                            });
                        })["catch"](logError);
                    })["catch"](logError);
                })["catch"](logError);
            });
        }), def.promise;
    }
    return {
        hashApplication: hashApplication,
        sync: Sync
    };
} ]), angular.module("talon.transaction", [ "ngStorage", "ngCordova", "talon.constants", "talon.nfc", "talon.common", "talon.settings", "pouchdb" ]), angular.module("talon.transaction").controller("PinController", [ "$scope", "$location", "$timeout", function($scope, $location, $timeout) {
    $scope.cancel = function() {
        $scope.passcode = "", $scope.modal.hide(), $scope.deferred.reject();
    }, $scope.add = function(value) {
        $scope.passcode.length < 4 && ($scope.passcode = $scope.passcode + value, 4 == $scope.passcode.length && $timeout(function() {
            $scope.deferred.resolve($scope.passcode), $scope.modal.hide(), $timeout(function() {
                $scope.passcode = "";
            }, 100);
        }, 0));
    }, $scope["delete"] = function() {
        $scope.passcode.length > 0 && ($scope.passcode = $scope.passcode.substring(0, $scope.passcode.length - 1));
    };
} ]).controller("POSController", [ "$scope", "$ionicModal", "$q", "transactionData", "$cordovaSpinnerDialog", "$timeout", function($scope, $ionicModal, $q, transactionData, $cordovaSpinnerDialog, $timeout) {
    $scope.decimalChar = ".", $scope.value = "", $scope.clear = function() {
        $scope.value = "";
    }, $scope["delete"] = function() {
        var string = $scope.value.toString(10);
        $scope.value = string.substring(0, string.length - 1);
    }, $scope.addDigit = function(digit) {
        (digit != $scope.decimalChar || -1 == $scope.value.indexOf($scope.decimalChar)) && ($scope.value = $scope.value + digit);
    }, $scope.process = function() {
        var afterTimeout = function(error) {
            console.log(error), $cordovaSpinnerDialog.hide(), $scope.clear();
        }, invalidCardOrPin = function(argument) {
            alert("Invalid PIN."), $cordovaSpinnerDialog.hide();
        }, noCredits = function(argument) {
            alert("Not enough credit"), $cordovaSpinnerDialog.hide();
        };
        return $scope.value ? void $scope.showPinModal().then(function(pin) {
            $cordovaSpinnerDialog.show("Read Card", "Please hold NFC card close to reader", !0);
            var amountToBeCharged = parseFloat($scope.value, 10);
            transactionData.loadCurrentData(pin).then(function(data) {
                $scope.clear(), $cordovaSpinnerDialog.hide(), $scope.showConfirmationModal({
                    card: data,
                    value: amountToBeCharged
                }, pin).then(function() {
                    $cordovaSpinnerDialog.show("Read Card", "Please hold NFC card close to reader", !0), transactionData.debitCard(data, amountToBeCharged, pin).then(function() {
                        $cordovaSpinnerDialog.hide();
                    })["catch"](noCredits);
                });
            })["catch"](invalidCardOrPin);
        })["catch"](afterTimeout) : void alert("There is no value to be charged.");
    };
} ]).controller("ConfirmationController", [ "$scope", "$location", "$timeout", function($scope, $location, $timeout) {
    $scope.$watch("data", function() {
        $scope.data && ($scope.total = $scope.data.card.current[0] + $scope.data.card.pending[0] - $scope.data.value, console.log($scope.total));
    }), $scope.cancel = function() {
        delete $scope.data, delete $scope.pin, $scope.modal.hide(), $scope.deferred.reject();
    }, $scope.pay = function() {
        delete $scope.data, delete $scope.pin, $scope.modal.hide(), $scope.deferred.resolve();
    };
} ]), angular.module("talon.transaction").service("transactionData", [ "$http", "$localStorage", "$q", "talonRoot", "$timeout", "$cordovaFile", "$cordovaFileTransfer", "$settings", "transactionHistoryDB", "$rootScope", "beneficiaryData", "httpUtils", function beneficiaryData($http, $localStorage, $q, talonRoot, $timeout, $cordovaFile, $cordovaFileTransfer, $settings, transactionHistoryDB, $rootScope, beneficiaryData, httpUtils) {
    function loadCurrentData(pin) {
        var failFunction = function(error) {
            throw console.log(error), error;
        };
        return beneficiaryData.readCardData(pin).then(function(card) {
            return beneficiaryData.fetchPendingLoads(pin, card).then(function(load) {
                var beneficiary = card.beneficiary, currentPayload = card.payload, pendingPayload = load.pending;
                return {
                    beneficiary: beneficiary,
                    current: currentPayload,
                    pending: pendingPayload
                };
            })["catch"](failFunction);
        })["catch"](failFunction);
    }
    function debitCard(info, amount, pin) {
        var def = $q.defer(), currentPayload = info.current, pendingPayload = info.pending, beneficiary = info.beneficiary, value = currentPayload[0] + pendingPayload[0] - amount, time = pendingPayload[0] > 0 ? pendingPayload[1].unix() : currentPayload[1];
        return value >= 0 && amount > 0 ? (value = Math.round(1e3 * value) / 1e3, $settings.hashApplication().then(function(hash) {
            var payload = "1933|" + value + "|" + time.toString(16);
            return 2 == $localStorage.authorizationData.tokenType ? (alert("You are logged in as an administrator. The POS mode is available for demo use only. The transaction will not be completed."), 
            void def.resolve()) : void $timeout(function() {
                beneficiaryData.updateCardData(payload, beneficiary.CardKey, pin, beneficiary.CardId).then(function(update) {
                    processTransaction({
                        beneficiary: beneficiary,
                        amountCredited: amount,
                        amountRemaining: value,
                        date: moment().unix(),
                        checksum: hash
                    }).then(function() {
                        def.resolve();
                    });
                });
            }, 500);
        })) : def.reject([ -1, "Not enough credit." ]), def.promise;
    }
    function processTransaction(transaction) {
        var def = $q.defer();
        return console.log("Writing transaction record in db"), transaction._id = transaction.beneficiary.BeneficiaryId + "-" + transaction.date, transaction.transactionCode = forge.util.bytesToHex(forge.random.getBytes(8)), 
        transaction.location = $rootScope.currentLocation, transactionHistoryDB.put(transaction), console.log(transaction), httpUtils.checkConnectivity().then(function() {
            console.log("Process Transaction Online"), $http.post(talonRoot + "api/App/MobileClient/ProcessNFCTransaction", transaction).then(function() {
                def.resolve();
            });
        })["catch"](function() {
            console.log("Process Transaction Offline"), def.resolve();
        }), def.promise;
    }
    return {
        processTransaction: processTransaction,
        loadCurrentData: loadCurrentData,
        debitCard: debitCard
    };
} ]);