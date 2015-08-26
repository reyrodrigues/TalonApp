angular.module("talon", [ "ionic", "talon.constants", "talon.controllers", "talon.templates", "talon.auth", "talon.beneficiary", "talon.common", "talon.nfc", "talon.transaction", "gettext" ]).run([ "$ionicPlatform", "$rootScope", "$timeout", "$localStorage", "gettextCatalog", "$ionicHistory", function($ionicPlatform, $rootScope, $timeout, $localStorage, gettextCatalog, $ionicHistory) {
    $rootScope.$watch("currentLocale", function() {
        gettextCatalog.setCurrentLanguage($rootScope.currentLocale), moment.locale($rootScope.currentLocale);
        var rtl = [ "ar", "he" ];
        $rootScope.currentDirection = rtl.indexOf($rootScope.currentLocale) > -1 ? "right" : "left";
    }), $rootScope.currentLocale = "en", $localStorage.currentUser && ($rootScope.currentUser = $localStorage.currentUser, $rootScope.organization = $localStorage.currentUser.Organization, 
    $rootScope.country = $localStorage.country, $rootScope.currentLocale = $localStorage.country.LanguageCode || "en"), $ionicPlatform.ready(function() {
        window.cordova && window.cordova.plugins.Keyboard && cordova.plugins.Keyboard.hideKeyboardAccessoryBar(!0), window.StatusBar && StatusBar.styleLightContent(), window.screen && window.screen.lockOrientation && screen.lockOrientation("portrait"), 
        window.nfc && (window.nfc.addNdefListener(function(event) {
            $rootScope.$broadcast("nfc:foundTag", event.tag);
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
        templateUrl: "templates/menu.html"
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
} ]).directive("tlnClick", function() {
    return function(scope, element, attrs) {
        element.bind("touchstart click", function(event) {
            event.preventDefault(), event.stopPropagation(), scope.$apply(attrs.tlnClick);
        });
    };
}), angular.module("talon.constants", []).constant("talonRoot", "https://talon.rescue.org/"), angular.module("talon.controllers", [ "ngStorage", "talon.templates", "talon.auth", "talon.beneficiary", "talon.common", "talon.nfc", "talon.transaction", "ngCordova" ]).controller("AppController", [ "$scope", "beneficiaryData", "$timeout", "$rootScope", "$cordovaGeolocation", "$ionicPlatform", "$nfcTools", "$localStorage", "$ionicModal", "$q", "$cordovaSpinnerDialog", "adminAuthentication", "$nfcTools", "$settings", "$interval", function($scope, beneficiaryData, $timeout, $rootScope, $cordovaGeolocation, $ionicPlatform, $nfcTools, $localStorage, $ionicModal, $q, $cordovaSpinnerDialog, adminAuthentication, $nfcTools, $settings, $interval) {
    function loadDeviceInfo() {}
    function showPinModal() {
        return $scope.pin.deferred = $q.defer(), $scope.pin.passcode = "", $scope.login.modal && $scope.pin.modal.show(), $scope.pin.deferred.promise;
    }
    function showConfirmationModal(data, pin) {
        return $scope.confirmation.deferred = $q.defer(), $scope.confirmation.data = data, $scope.confirmation.pin = pin, $scope.confirmation.modal && $scope.confirmation.modal.show(), 
        $scope.confirmation.deferred.promise;
    }
    function showQRConfirmationModal(voucher, pin) {
        return $scope.qrConfirmation.deferred = $q.defer(), $scope.qrConfirmation.vouchers = [ voucher ], $scope.qrConfirmation.pin = pin, $scope.qrConfirmation.modal && $scope.qrConfirmation.modal.show(), 
        $scope.qrConfirmation.deferred.promise;
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
    $scope.pin = $scope.$new(), $scope.login = $scope.$new(), $scope.confirmation = $scope.$new(), $scope.qrConfirmation = $scope.$new(), $scope.signature = $scope.$new(), 
    $rootScope.device = {}, $ionicModal.fromTemplateUrl("templates/login.html", {
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
    }), $ionicModal.fromTemplateUrl("templates/qr-confirmation.html", {
        scope: $scope.qrConfirmation,
        backdropClickToClose: !1
    }).then(function(modal) {
        $scope.qrConfirmation.modal = modal;
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
    }), $ionicPlatform.ready(loadDeviceInfo), $rootScope.$on("onResumeCordova", loadDeviceInfo), $ionicPlatform.on("resume", function() {
        $rootScope.currentUser = $localStorage.currentUser, $rootScope.organization = $localStorage.currentUser.Organization, $rootScope.country = $localStorage.country, 
        $rootScope.currentLocale = $localStorage.country.LanguageCode || "en";
    }), $ionicPlatform.ready(function() {
        var posOptions = {
            timeout: 1e4,
            enableHighAccuracy: !1
        };
        $cordovaGeolocation.getCurrentPosition(posOptions).then(function(position) {
            $rootScope.currentLocation = position.coords;
        }, function(err) {});
    }), $scope.showPinModal = showPinModal, $scope.showLoginModal = showLoginModal, $scope.showConfirmationModal = showConfirmationModal, $scope.showSignaturePad = showSignaturePad, 
    $scope.showQRConfirmationModal = showQRConfirmationModal, $interval(function() {
        $settings.sync();
    }, 12e4);
} ]), angular.module("gettext").run([ "gettextCatalog", function(gettextCatalog) {
    gettextCatalog.setStrings("ar", {
        "0": "0",
        "1": "1",
        "2": "2",
        "3": "3",
        "4": "4",
        "5": "5",
        "6": "6",
        "7": "7",
        "8": "8",
        "9": "9",
        "Assign Voucher Book": "تعيين كتاب الإيصال",
        Beneficiary: "المستفيد",
        "Beneficiary not registered": "المستفيد غير مسجلة",
        Cancel: "إلغاء",
        "Card value after transaction": "قيمة بطاقة بعد الحركة",
        Code: "الكود",
        Confirmation: "تأكيد",
        Country: "الدولة",
        Distribution: "توزيع",
        "Download Data From Server": "تحميل البيانات من الملقم",
        "Enter Pin": "إدخال الرمز السري",
        "Invalid PIN.": "غير صالح",
        "Invalid pin.": "غير صالح",
        "Invalid username or password.": "هناك خطا في اسم المستخدم او كلمة المرور",
        "Invalid voucher.": "قسيمة غير صالحة",
        Invoices: "الفواتير",
        "Last Synced On:": "مزامن آخر على:",
        "Location:": "الموقع الجغرافي:",
        "Log in": "تسجيل الدخول",
        Login: "تسجيل الدخول",
        Logout: "تسجيل خروج",
        "Mobile Number:": "رقم الجوال",
        "Name:": "الاسم:",
        "Not enough credit": "الائتمان غير كافية",
        PIN: "ثبت",
        "POS Mode": "نقطة البيع	",
        Password: "كلمة السر",
        "Pay with card": "الدفع بواسطة بطاقة",
        "Pending card load value": "قيمة تحميل بطاقة معلقة",
        "Please hold NFC card close to reader": "يرجى إجراء بطاقة نفك قريبة من القارئ",
        "Please sign below": "الرجاء التوقيع أدناه",
        "Process transaction": "الحركة عملية",
        "Provision Card": "بطاقة الاعتماد",
        "Read Card": "بطاقة القراءة",
        Receipts: "الإيصالات",
        "Reload Card": "أعادة التحميل",
        "Scan another voucher": "مسح آخر قسيمة",
        "Scan first page": "مسح الصفحة الأولى",
        Search: "بحث",
        "Select Beneficiary": "حدد المستفيد",
        "Set Pin": "تعيين رقم التعريف الشخصي",
        Settings: "إعدادات",
        "Sync Data": "مزامنة البيانات",
        "The transaction in the amount of": "الحركة في مبلغ من",
        "There is no value to be charged.": "لا توجد قيمة تكون مكلفة.",
        "Updating PIN": "تحديث PIN",
        Username: "المستخدم",
        "Value of this transaction": "قيمة هذه الصفقة",
        "Value:": "اسم القيمة:",
        "View Beneficiary": "رأي المستفيدين",
        Voucher: "قسيمة شراء",
        "Voucher already added": "الإيصال بالفعل بإضافة",
        "Voucher belongs to a different beneficiary.": "قسيمة ينتمي إلى مستفيد آخر.",
        "Voucher can't be used before": "لا يمكن استخدام القسيمة قبل",
        "You are logged in as an administrator. The POS mode is available for demo use only. The transaction will not be completed.": "دخولك كمسؤول. وضع نقاط البيع متاح للاستخدام التجريبي فقط. لن تكتمل الصفقة.",
        "has been completed.": "قد اكتمل.",
        Unknown: "غير معروف"
    }), gettextCatalog.setStrings("en", {
        "0": "0",
        "1": "1",
        "2": "2",
        "3": "3",
        "4": "4",
        "5": "5",
        "6": "6",
        "7": "7",
        "8": "8",
        "9": "9",
        "Assign Voucher Book": "Assign Voucher Book",
        Beneficiary: "Beneficiary",
        "Beneficiary not registered": "Beneficiary not registered",
        Cancel: "Cancel",
        "Card value after transaction": "Card value after transaction",
        Code: "Code",
        Confirmation: "Confirmation",
        Country: "Country",
        Distribution: "Distribution",
        "Download Data From Server": "Download Data From Server",
        "Enter Pin": "Enter Pin",
        "Invalid PIN.": "Invalid PIN.",
        "Invalid pin.": "Invalid pin.",
        "Invalid username or password.": "Invalid username or password.",
        "Invalid voucher.": "Invalid voucher.",
        Invoices: "Invoices",
        "Last Synced On:": "Last Synced On:",
        "Location:": "Location:",
        "Log in": "Log in",
        Login: "Login",
        Logout: "Logout",
        "Mobile Number:": "Mobile Number:",
        "Name:": "Name:",
        "Not enough credit": "Not enough credit",
        PIN: "PIN",
        "POS Mode": "POS Mode",
        Password: "Password",
        "Pay with card": "Pay with card",
        "Pending card load value": "Pending card load value",
        "Please hold NFC card close to reader": "Please hold NFC card close to reader",
        "Please sign below": "Please sign below",
        "Process transaction": "Process transaction",
        "Provision Card": "Provision Card",
        "Read Card": "Read Card",
        Receipts: "Receipts",
        "Reload Card": "Reload Card",
        "Scan another voucher": "Scan another voucher",
        "Scan first page": "Scan first page",
        Search: "Search",
        "Select Beneficiary": "Select Beneficiary",
        "Set Pin": "Set Pin",
        Settings: "Settings",
        "Sync Data": "Sync Data",
        "The transaction in the amount of": "The transaction in the amount of",
        "There is no value to be charged.": "There is no value to be charged.",
        "Updating PIN": "Updating PIN",
        Username: "Username",
        "Value of this transaction": "Value of this transaction",
        "Value:": "Value:",
        "View Beneficiary": "View Beneficiary",
        Voucher: "Voucher",
        "Voucher already added": "Voucher already added",
        "Voucher belongs to a different beneficiary.": "Voucher belongs to a different beneficiary.",
        "Voucher can't be used before": "Voucher can't be used before",
        "You are logged in as an administrator. The POS mode is available for demo use only. The transaction will not be completed.": "You are logged in as an administrator. The POS mode is available for demo use only. The transaction will not be completed.",
        "has been completed.": "has been completed.",
        Unknown: "Unknown"
    }), gettextCatalog.setStrings("pt", {
        "0": "0",
        "1": "1",
        "2": "2",
        "3": "3",
        "4": "4",
        "5": "5",
        "6": "6",
        "7": "7",
        "8": "8",
        "9": "9",
        "Assign Voucher Book": "Associar Livro de Cupoms",
        Beneficiary: "Beneficiário",
        "Beneficiary not registered": "Beneficiário não registrado",
        Cancel: "Cancelar",
        "Card value after transaction": "Valor do cartão após a transação",
        Code: "Código",
        Confirmation: "Confirmar",
        Country: "País",
        Distribution: "Distribuição",
        "Download Data From Server": "Baixar dados do servidor",
        "Enter Pin": "Entre PIN",
        "Invalid PIN.": "PIN inválido.",
        "Invalid pin.": "PIN inválido.",
        "Invalid username or password.": "Usuário ou senha inválidos.",
        "Invalid voucher.": "Cupom inválido.",
        Invoices: "Faturas",
        "Last Synced On:": "Última sincronização em:",
        "Location:": "Localização:",
        "Log in": "Entrar",
        Login: "Entrar",
        Logout: "Sair",
        "Mobile Number:": "Numero do celular",
        "Name:": "Nome",
        "Not enough credit": "Não há credito suficiente",
        PIN: "PIN",
        "POS Mode": "Modo PDV",
        Password: "Senha",
        "Pay with card": "Pagar com cartão",
        "Pending card load value": "Carga do cartão pendente",
        "Please hold NFC card close to reader": "Por favor segure o cartão NFC contra o leitor",
        "Please sign below": "Por favor assine abaixo",
        "Process transaction": "Processar transação",
        "Provision Card": "Configurar cartao",
        "Read Card": "Ler cartão",
        Receipts: "Recibos",
        "Reload Card": "Recarregar cartão",
        "Scan another voucher": "Escanear outro cupom",
        "Scan first page": "Escanear primeira página",
        Search: "Buscar",
        "Select Beneficiary": "Selecione Beneficiário ",
        "Set Pin": "Escolher PIN",
        Settings: "Configurações ",
        "Sync Data": "Sincronizar dados",
        "The transaction in the amount of": "A transação no valor de",
        "There is no value to be charged.": "Não há valor a ser cobrado.",
        "Updating PIN": "Atualizando PIN",
        Username: "Usuário",
        "Value of this transaction": "Valor dessa transação",
        "Value:": "Valor:",
        "View Beneficiary": "Ver beneficiário",
        Voucher: "Cupom",
        "Voucher already added": "Cupom já foi associado",
        "Voucher belongs to a different beneficiary.": "Cupom pertence a outro beneficiário",
        "Voucher can't be used before": "Este cupom não pode ser usado antes",
        "You are logged in as an administrator. The POS mode is available for demo use only. The transaction will not be completed.": "Você esta logado como um administrador. O modo PDV só é disponível para demonstrações. Essa transação não será completada. ",
        "has been completed.": "foi completada",
        Unknown: "Desconhecido"
    });
} ]), angular.module("talon.auth", [ "ngStorage", "ngCordova", "talon.constants", "pouchdb", "gettext" ]), angular.module("talon.auth").controller("LoginController", [ "$scope", "$ionicHistory", "$state", "$rootScope", "$localStorage", "vendorAuthentication", "adminAuthentication", function($scope, $ionicHistory, $state, $rootScope, $localStorage, vendorAuthentication, adminAuthentication) {
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
            $localStorage.country || ($localStorage.country = countries[0]), $rootScope.country = $localStorage.country, $rootScope.currentLocale = $localStorage.country.LanguageCode || "en", 
            $rootScope.availableCountries = $rootScope.currentUser.Countries.length > 1 ? countries : !1, deferred.resolve();
        } else $http.get(serviceRoot + "api/ApplicationUser/Me").then(function(response) {
            $rootScope.currentUser = response.data, $localStorage.currentUser = response.data, $rootScope.organization = $rootScope.currentUser.Organization, $localStorage.organization = $rootScope.currentUser.Organization;
            var countries = $rootScope.currentUser.Countries.map(function(c) {
                return c.Country;
            });
            $localStorage.country || ($localStorage.country = countries[0]), $rootScope.country = $localStorage.country, $rootScope.currentLocale = $localStorage.country.LanguageCode || "en", 
            $rootScope.availableCountries = $rootScope.currentUser.Countries.length > 1 ? countries : !1, deferred.resolve();
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
        return $localStorage.currentUser ? ($rootScope.currentUser = $localStorage.currentUser, $localStorage.country = $rootScope.currentUser.Country, $rootScope.country = $localStorage.country, 
        $rootScope.currentLocale = $localStorage.country.LanguageCode || "en", deferred.resolve()) : $http.get(talonRoot + "api/App/VendorProfile/LoadProfile").then(function(response) {
            $rootScope.currentUser = response.data, $localStorage.currentUser = response.data, $localStorage.country || ($localStorage.country = $rootScope.currentUser.Country), 
            $rootScope.country = $localStorage.country, $rootScope.currentLocale = $localStorage.country.LanguageCode || "en", deferred.resolve();
        })["catch"](function(error) {
            console.log(error), deferred.reject(error);
        }), deferred.promise;
    }
    var vendorAuthServiceFactory = {
        login: login
    };
    return vendorAuthServiceFactory;
} ]), angular.module("talon.beneficiary", [ "ngStorage", "ngCordova", "talon.constants", "pouchdb", "talon.nfc", "talon.common", "gettext" ]), angular.module("talon.beneficiary").controller("BeneficiaryController", [ "$scope", "$localStorage", "$ionicModal", "$cordovaSpinnerDialog", "beneficiaryData", "gettext", "$filter", function($scope, $localStorage, $ionicModal, $cordovaSpinnerDialog, beneficiaryData, gettext, $filter) {
    function reloadCard() {
        var failFunction = function(error) {
            console.log(error), $cordovaSpinnerDialog.hide();
        };
        $scope.showPinModal().then(function(pin) {
            $cordovaSpinnerDialog.show(translate(gettext("Reload Card")), translate(gettext("Please hold NFC card close to reader")), !0), beneficiaryData.reloadCard(pin).then(function() {
                $cordovaSpinnerDialog.hide();
            })["catch"](failFunction);
        })["catch"](failFunction);
    }
    function readCard() {
        var failFunction = function(error) {
            console.log(error), $cordovaSpinnerDialog.hide();
        };
        $cordovaSpinnerDialog.show(translate(gettext("Read Card")), translate(gettext("Please hold NFC card close to reader")), !0), beneficiaryData.readRawCardData().then(function(data) {
            $scope.showPinModal().then(function(pin) {
                beneficiaryData.readCardData(pin, data).then(function(info) {
                    $scope.cardInfo = info, $cordovaSpinnerDialog.hide();
                })["catch"](failFunction);
            })["catch"](failFunction);
        })["catch"](failFunction);
    }
    $scope.reloadCard = reloadCard, $scope.readCard = readCard;
    var translate = $filter("translate");
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
} ]).controller("ViewBeneficiaryController", [ "$scope", "$localStorage", "$q", "$timeout", "$http", "$state", "talonRoot", "beneficiaryData", "$cordovaSpinnerDialog", "$ionicModal", "gettext", "$filter", function($scope, $localStorage, $q, $timeout, $http, $state, talonRoot, beneficiaryData, $cordovaSpinnerDialog, $ionicModal, gettext, $filter) {
    $scope.voucherBook = $scope.$new();
    var translate = $filter("translate");
    beneficiaryData.fetchBeneficiaryById($state.params.id).then(function(beneficiaries) {
        $scope.beneficiary = beneficiaries, $scope.voucherBook.scan = function() {
            var failFunction = function(error) {
                console.log(error);
            };
            return window.cordova && window.cordova.plugins && window.cordova.plugins.barcodeScanner ? void cordova.plugins.barcodeScanner.scan(function(result) {
                $timeout(function() {
                    var code = result.text;
                    return result.cancelled ? void console.log(result.cancelled) : void beneficiaryData.assignVoucherBook($scope.beneficiary.Id, $scope.voucherBook.selectedDistributionId, code).then(function() {
                        $scope.voucherBook.modal.hide();
                    })["catch"](failFunction);
                });
            }, failFunction) : (console.log("DEBUGGING"), void beneficiaryData.assignVoucherBook($scope.beneficiary.Id, $scope.voucherBook.selectedDistributionId, "100100").then(function() {
                $scope.voucherBook.modal.hide();
            })["catch"](failFunction));
        }, $scope.voucherBook.updateDistribution = function(distribution) {
            $scope.voucherBook.selectedDistributionId = distribution.id;
        }, $scope.voucherBook.cancel = function() {
            $scope.voucherBook.modal.hide();
        }, $scope.setPin = function() {
            var failFunction = function(error) {
                console.log(error);
            }, beneficiaryId = $scope.beneficiary.Id;
            $scope.showPinModal().then(function(pin) {
                $cordovaSpinnerDialog.show(translate(gettext("PIN")), translate(gettext("Updating PIN")), !0), beneficiaryData.setPin(beneficiaryId, pin).then(function() {
                    $cordovaSpinnerDialog.hide();
                })["catch"](failFunction);
            })["catch"](failFunction);
        }, $scope.provisionCard = function() {
            var failFunction = function(error) {
                console.log(error), $cordovaSpinnerDialog.hide();
            }, beneficiaryId = $scope.beneficiary.Id;
            $cordovaSpinnerDialog.show(translate(gettext("Read Card")), translate(gettext("Please hold NFC card close to reader")), !0), beneficiaryData.provisionBeneficiary(beneficiaryId).then(function() {
                $cordovaSpinnerDialog.hide();
            })["catch"](failFunction);
        }, $scope.assignVoucherBook = function() {
            $ionicModal.fromTemplateUrl("templates/assign-voucher-book.html", {
                scope: $scope.voucherBook
            }).then(function(modal) {
                $scope.voucherBook.modal = modal, $scope.voucherBook.modal.show(), beneficiaryData.listDistributions($scope.beneficiary.Id).then(function(distributions) {
                    $scope.voucherBook.distributions = distributions, $scope.voucherBook.selectedDistributionId = null;
                });
            });
        };
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
        template: '<div id="signature-pad" style="height:60%; overflow: hidden;"></div><div class="row"><div class="col"><button class="button button-assertive button-block" tln-click="closeDialog()">Cancel</button></div><div class="col"><button class="button button-stable button-block" tln-click="clearSignature()">Clear</button></div><div class="col"></div><div class="col"></div><div class="col"><button class="button button-positive button-block" tln-click="acceptSignature()">Accept</button></div></div>'
    };
} ]), angular.module("talon.beneficiary").service("beneficiaryData", [ "$http", "$localStorage", "keyDB", "cardLoadDB", "$q", "talonRoot", "qrCodeDB", "$nfcTools", "$ionicPlatform", "$timeout", "$cordovaFile", "$cordovaFileTransfer", "httpUtils", "encryption", "$state", "gettext", "$filter", function($http, $localStorage, keyDB, cardLoadDB, $q, talonRoot, qrCodeDB, $nfcTools, $ionicPlatform, $timeout, $cordovaFile, $cordovaFileTransfer, httpUtils, encryption, $state, gettext, $filter) {
    function validateQRCode(code, pin) {
        return qrCodeDB.find(function(o) {
            return o.VoucherCode == code;
        }).then(function(res) {
            var docs = res;
            if (0 == docs.length) throw new Error(translate(gettext("Invalid voucher.")));
            var voucher = docs[0];
            return keyDB.find(function(o) {
                return o.BeneficiaryId == voucher.BeneficiaryId;
            }).then(function(res) {
                if (0 == res.length) throw new Error(translate(gettext("Beneficiary not registered")));
                var beneficiary = res[0], encryptedData = forge.util.decode64(voucher.Payload), decryptedString = encryption.decrypt(encryptedData, pin, beneficiary.CardKey);
                if (!decryptedString) throw new Error(translate(gettext("Invalid pin.")));
                var voucherValues = decryptedString.split("|"), value = parseFloat(voucherValues[1], 10), validAfter = parseInt(voucherValues[2], 16), voucherCode = voucherValues[3];
                return {
                    value: value,
                    validAfter: validAfter,
                    voucherCode: voucherCode,
                    beneficiary: beneficiary
                };
            });
        });
    }
    function ProvisionBeneficiary(beneficiaryId) {
        var def = $q.defer();
        return $nfcTools.readId().then(function(id) {
            $http.post(talonRoot + "api/App/MobileClient/ProvisionBeneficiary", {
                beneficiaryId: beneficiaryId,
                cardId: id
            }).then(function(k) {
                var key = k.data;
                keyDB.upsert(key._id, key), $http.get(talonRoot + "api/App/MobileClient/GenerateInitialLoad?beneficiaryId=" + key.BeneficiaryId).then(function(res) {
                    var payload = res.data;
                    payload = forge.util.bytesToHex(forge.util.decode64(payload)), $nfcTools.writeData(payload, key.CardId).then(def.resolve.bind(def));
                });
            });
        })["catch"](function() {
            def.reject();
        }), def.promise;
    }
    function SetPin(beneficiaryId, pin) {
        return $http.post(talonRoot + "api/App/MobileClient/SetBeneficiaryPin", {
            beneficiaryId: beneficiaryId,
            pin: pin
        }).then(function(k) {});
    }
    function AssignVoucherBook(beneficiaryId, distributionId, serialNumber) {
        return $http.post(talonRoot + "api/App/MobileClient/AssignVoucherBook", {
            beneficiaryId: beneficiaryId,
            distributionId: distributionId,
            serialNumber: serialNumber
        }).then(function(k) {});
    }
    function ListDistributions(beneficiaryId) {
        return $http.get(talonRoot + "api/App/MobileClient/ListDistributionsForBeneficiary?beneficiaryId=" + beneficiaryId).then(function(res) {
            return res.data;
        });
    }
    function ReadRawCardData() {
        var def = $q.defer(), resolved = !1, timeout = $timeout(function() {
            resolved || (resolved = !0, def.reject());
        }, 15e3);
        return $nfcTools.readIdAndData().then(function(cardData) {
            resolved || ($timeout.cancel(timeout), def.resolve(cardData), resolved = !0);
        }), def.promise;
    }
    function ReadCardData(pin, data) {
        var dataPromise = null;
        return dataPromise = $q.when(data ? data : ReadRawCardData()), console.log("Acquiring data"), dataPromise.then(function(cardData) {
            return console.log("ed data"), console.log(cardData), FetchBeneficiary(cardData.id).then(function(beneficiary) {
                return console.log("beneficiary"), console.log(cardData.data, beneficiary.CardKey, pin), DecryptCardData(cardData.data, beneficiary.CardKey, pin).then(function(payload) {
                    return console.log("decrypted"), {
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
            cardLoadDB.find(function(o) {
                return o.CardId == beneficiary.CardId;
            }).then(function(res) {
                0 == res.length && def.resolve({
                    pending: [ 0, 0 ],
                    card: card
                });
                var loads = res[0].Load, data = loads.map(function(d) {
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
        return keyDB.find(function(o) {
            return o.CardId == id;
        }).then(function(s) {
            s.length && def.resolve(s[0]), def.reject();
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
    var translate = $filter("translate");
    return {
        reloadCard: ReloadCard,
        readCardData: ReadCardData,
        readRawCardData: ReadRawCardData,
        updateCardData: UpdateCardData,
        provisionBeneficiary: ProvisionBeneficiary,
        listBeneficiariesByName: ListBeneficiariesByName,
        fetchBeneficiaryById: FetchBeneficiaryById,
        fetchPendingLoads: FetchPendingLoads,
        validateQRCode: validateQRCode,
        setPin: SetPin,
        listDistributions: ListDistributions,
        assignVoucherBook: AssignVoucherBook
    };
} ]), angular.module("talon.common", [ "ngStorage", "ngCordova", "talon.constants", "pouchdb", "gettext" ]), window.plugins || (window.plugins = {}), window.plugins.spinnerDialog || (window.plugins.spinnerDialog = {
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
} ]), angular.module("talon.common").factory("pouchDBUtils", [ "pouchDBDecorators", function(pouchDBDecorators) {
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
} ]).service("httpUtils", [ "$q", "$http", "talonRoot", "$cordovaNetwork", function($q, $http, talonRoot, $cordovaNetwork) {
    function checkConnectivity() {
        var def = $q.defer(), isOnline = !0;
        if (isOnline = !0, !isOnline) return def.reject(), def.promise;
        var echo = forge.util.bytesToHex(forge.random.getBytes(16));
        return $http.get(talonRoot + "api/App/MobileClient/IsAlive?echo=" + echo, {
            timeout: 2e3,
            cache: !1
        }).then(function(r) {
            200 !== r.status || echo != r.data ? def.reject() : def.resolve();
        }, function() {
            console.log("Fail?"), def.reject();
        })["catch"](function() {
            console.log("Fail?"), def.reject();
        }), def.promise;
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
} ]), angular.module("talon.common").service("baseDB", [ "$q", "$localStorage", function($q, $localStorage) {
    function BaseDB(name) {
        var internalName = "DB_" + name;
        this.find = function(selector) {
            var def = $q.defer(), filtered = $localStorage[internalName] || [];
            return selector && (filtered = filtered.filter(selector)), def.resolve(filtered), def.promise;
        }, this.replace = function(col) {
            $localStorage[internalName] = col || [];
            var def = $q.defer();
            return def.resolve(col), def.promise;
        }, this.upsert = function(_id, obj) {
            var def = $q.defer(), filtered = $localStorage[internalName] || [];
            return filtered = filtered.filter(function(o) {
                return o && o._id && o._id != _id;
            }), filtered.push(obj), $localStorage[internalName] = filtered, def.resolve(obj), def.promise;
        }, this.all = function() {
            return $localStorage[internalName];
        };
    }
    return BaseDB;
} ]).service("keyDB", [ "pouchDB", "pouchDBUtils", "baseDB", function(pouchDB, pouchDBUtils, baseDB) {
    var db = new baseDB("keyDB");
    return db;
} ]).service("cardLoadDB", [ "pouchDB", "pouchDBUtils", "baseDB", function(pouchDB, pouchDBUtils, baseDB) {
    var db = new baseDB("cardLoadDB");
    return db;
} ]).service("qrCodeDB", [ "pouchDB", "pouchDBUtils", "baseDB", function(pouchDB, pouchDBUtils, baseDB) {
    var db = new baseDB("qrCodeDB");
    return db;
} ]).service("cardLoadHistoryDB", [ "pouchDB", "pouchDBUtils", "baseDB", function(pouchDB, pouchDBUtils, baseDB) {
    var db = new baseDB("cardLoadHistoryDB");
    return db;
} ]).service("transactionHistoryDB", [ "pouchDB", "pouchDBUtils", "baseDB", function(pouchDB, pouchDBUtils, baseDB) {
    var db = new baseDB("transactionHistoryDB");
    return db;
} ]), angular.module("talon.nfc", [ "ngStorage", "ngCordova", "talon.constants", "pouchdb", "gettext" ]), angular.module("talon.nfc").service("$nfcTools", [ "$timeout", "$q", "$cordovaDevice", "$rootScope", "$localStorage", function($timeout, $q, $cordovaDevice, $rootScope, $localStorage) {
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
        var def = $q.defer();
        return def.resolve(UseMock()), def.promise;
    }
    function readId() {
        function UseMock() {
            return readIdAndData().then(function(tag) {
                return tag.id;
            });
        }
        var def = $q.defer();
        return def.resolve(UseMock()), def.promise;
    }
    function writeData(dataHex, id) {
        function UseMock(data, id) {
            return $localStorage.mockCard = [ data, id ], !0;
        }
        console.log("Writing data"), console.log(dataHex);
        var def = $q.defer();
        return def.resolve(UseMock(dataHex, id)), def.promise;
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
} ]), angular.module("talon.settings", [ "ngStorage", "ngCordova", "talon.constants", "pouchdb", "gettext" ]), angular.module("talon.settings").controller("SyncController", [ "$scope", "$localStorage", "$settings", function($scope, $localStorage, $settings) {
    $scope.setupVendor = function() {
        $settings.sync().then(function() {
            $scope.$broadcast("scroll.refreshComplete");
        });
    };
} ]).controller("SettingsController", [ "$scope", "$localStorage", "$rootScope", "$nfcTools", function($scope, $localStorage, $rootScope, $nfcTools) {
    function updateCountry(country) {
        $localStorage.country = country, $rootScope.country = country;
    }
    function logout() {
        delete $localStorage.authorizationData, $scope.showLoginModal();
    }
    $scope.country = $rootScope.country, $scope.logout = logout, $scope.updateCountry = updateCountry, $scope.useNDEF = function() {
        $localStorage.useNDEF = !0;
    };
} ]), angular.module("talon.settings").service("$settings", [ "$timeout", "$q", "$cordovaFile", "httpUtils", "$localStorage", "$http", "$ionicPlatform", "talonRoot", "$rootScope", "$cordovaNetwork", "$cordovaDevice", "$cordovaFileTransfer", "keyDB", "cardLoadDB", "qrCodeDB", "cardLoadHistoryDB", "transactionHistoryDB", "encryption", "$injector", function($timeout, $q, $cordovaFile, httpUtils, $localStorage, $http, $ionicPlatform, talonRoot, $rootScope, $cordovaNetwork, $cordovaDevice, $cordovaFileTransfer, keyDB, cardLoadDB, qrCodeDB, cardLoadHistoryDB, transactionHistoryDB, encryption, $injector) {
    function hashApplication() {
        return $q.when([]);
    }
    function Sync() {
        var successFunction = function() {
            return $rootScope.lastSynced = moment().format("LLL"), !0;
        }, def = $q.defer();
        return httpUtils.checkConnectivity().then(function() {
            $q.all([ $http.get(talonRoot + "api/App/MobileClient/DownloadKeyset"), LoadKeys(), LoadQRCodes(), LoadCardLoads(), UploadStoredData() ]).then(function(promises) {
                var keyset = promises[0];
                $localStorage.keyset = keyset.data, successFunction(), def.resolve();
            })["catch"](def.resolve.bind(def));
        })["catch"](function() {
            LoadPayloadFromNetwork().then(UploadPayloadToNetwork).then(successFunction).then(def.resolve.bind(def));
        }), def.promise;
    }
    function UploadStoredData() {
        var cardLoads = cardLoadHistoryDB.all(), transactions = transactionHistoryDB.all();
        return $q.all([ $http.post(talonRoot + "api/App/MobileClient/UploadCardLoads", cardLoads), $http.post(talonRoot + "api/App/MobileClient/UploadTransactions", transactions) ]).then(function() {
            cardLoadHistoryDB.replace(), transactionHistoryDB.replace();
        });
    }
    function LoadKeys() {
        return console.log("Internet"), $http.get(talonRoot + "api/App/MobileClient/DownloadBeneficiaryKeys").then(function(k) {
            return LoadKeysInternal(k.data);
        });
    }
    function LoadKeysInternal(data) {
        return keyDB.replace(data);
    }
    function LoadCardLoads() {
        return console.log("Internet"), $http.get(talonRoot + "api/App/MobileClient/GenerateCardLoads").then(function(r) {
            return LoadCardLoadsInternal(r.data);
        });
    }
    function LoadCardLoadsInternal(data) {
        return cardLoadDB.replace(data);
    }
    function LoadQRCodes() {
        return console.log("Internet"), $http.get(talonRoot + "api/App/MobileClient/GenerateQRCodes").then(function(r) {
            return LoadQRCodesInternal(r.data);
        });
    }
    function LoadQRCodesInternal(data) {
        return qrCodeDB.replace(data);
    }
    function UploadPayloadToNetwork(argument) {
        var def = $q.defer();
        return def.resolve(), def;
    }
    function LoadPayloadFromNetwork() {
        var def = $q.defer();
        return def.resolve(), def;
    }
    return {
        hashApplication: hashApplication,
        sync: Sync
    };
} ]), angular.module("talon.transaction", [ "ngStorage", "ngCordova", "talon.constants", "talon.nfc", "talon.common", "talon.settings", "pouchdb", "gettext" ]), 
angular.module("talon.transaction").controller("PinController", [ "$scope", "$location", "$timeout", function($scope, $location, $timeout) {
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
} ]).controller("POSController", [ "$scope", "$ionicModal", "$q", "transactionData", "beneficiaryData", "$cordovaSpinnerDialog", "$timeout", "$filter", "gettext", function($scope, $ionicModal, $q, transactionData, beneficiaryData, $cordovaSpinnerDialog, $timeout, $filter, gettext) {
    function TransactionCompleted(amount) {
        console.log("Finishing up" + amount), alert(translate(gettext("The transaction in the amount of")) + " " + $filter("currency")(amount, $scope.country.CurrencyIsoCode + " ") + " " + translate(gettext("has been completed.")));
    }
    var translate = $filter("translate");
    $scope.decimalChar = ".", $scope.value = "", $scope.clear = function() {
        $scope.value = "";
    }, $scope["delete"] = function() {
        var string = $scope.value.toString(10);
        $scope.value = string.substring(0, string.length - 1);
    }, $scope.addDigit = function(digit) {
        (digit != $scope.decimalChar || -1 == $scope.value.indexOf($scope.decimalChar)) && ($scope.value = $scope.value + digit);
    }, $scope.qrDialogOpen = !1, $scope.processQR = function() {
        var failFunction = function(error) {
            $scope.qrDialogOpen = !1, alert(error.message), console.log(error);
        };
        if (!$scope.qrDialogOpen) {
            $scope.qrDialogOpen = !0;
            var code = localStorage.qrCode;
            return void $scope.showPinModal().then(function(pin) {
                console.log(code), beneficiaryData.validateQRCode(code, pin).then(function(voucher) {
                    $scope.showQRConfirmationModal(voucher, pin).then(function(vouchers) {
                        var beneficiary = vouchers[0].beneficiary, voucherCodes = vouchers.map(function(v) {
                            return v.voucherCode;
                        });
                        transactionData.debitQRCodes(voucherCodes, beneficiary).then(function() {
                            var amountToBeCharged = vouchers.map(function(a) {
                                return a.value;
                            }).reduce(function(a, b) {
                                return a + b;
                            }, 0);
                            TransactionCompleted(amountToBeCharged);
                        })["catch"](failFunction);
                    })["catch"](failFunction);
                })["catch"](failFunction);
            });
        }
    }, $scope.process = function() {
        var afterTimeout = function(error) {
            console.log(error), $cordovaSpinnerDialog.hide(), $scope.clear();
        }, invalidCardOrPin = function(argument) {
            alert(translate(gettext("Invalid PIN."))), $cordovaSpinnerDialog.hide();
        }, noCredits = function(argument) {
            alert(translate(gettext("Not enough credit"))), $cordovaSpinnerDialog.hide();
        };
        return $scope.value ? ($cordovaSpinnerDialog.show(translate(gettext("Read Card")), translate(gettext("Please hold NFC card close to reader")), !0), void beneficiaryData.readRawCardData().then(function(rawCardData) {
            $cordovaSpinnerDialog.hide(), $scope.showPinModal().then(function(pin) {
                var amountToBeCharged = parseFloat($scope.value, 10);
                transactionData.loadCurrentData(pin, rawCardData).then(function(data) {
                    $scope.clear(), $scope.showConfirmationModal({
                        card: data,
                        value: amountToBeCharged
                    }, pin).then(function() {
                        $cordovaSpinnerDialog.show(translate(gettext("Proccessing Transaction")), translate(gettext("Please wait")), !0), transactionData.debitCard(data, amountToBeCharged, pin).then(function() {
                            $cordovaSpinnerDialog.hide(), TransactionCompleted(amountToBeCharged);
                        }, noCredits, function(arg) {
                            "CARD" === arg && ($cordovaSpinnerDialog.hide(), $cordovaSpinnerDialog.show(translate(gettext("Read Card")), translate(gettext("Please hold NFC card close to reader")), !0));
                        })["catch"](noCredits);
                    });
                })["catch"](invalidCardOrPin);
            })["catch"](afterTimeout);
        })["catch"](afterTimeout)) : void alert(translate(gettext("There is no value to be charged.")));
    };
} ]).controller("ConfirmationController", [ "$scope", "$location", "$timeout", function($scope, $location, $timeout) {
    $scope.$watch("data", function() {
        $scope.data && ($scope.total = $scope.data.card.current[0] + $scope.data.card.pending[0] - $scope.data.value, console.log($scope.total));
    }), $scope.cancel = function() {
        delete $scope.data, delete $scope.pin, $scope.modal.hide(), $scope.deferred.reject();
    }, $scope.pay = function() {
        delete $scope.data, delete $scope.pin, $scope.modal.hide(), $scope.deferred.resolve();
    };
} ]).controller("QRConfirmationController", [ "$scope", "$location", "beneficiaryData", "$timeout", "gettext", "$filter", function($scope, $location, beneficiaryData, $timeout, gettext, $filter) {
    var translate = $filter("translate");
    $scope.addVoucher = function() {
        var failFunction = function(error) {
            alert(error.message), $cordovaSpinnerDialog.hide();
        }, pin = $scope.pin;
        window.cordova && window.cordova.plugins && cordova.plugins.barcodeScanner && cordova.plugins.barcodeScanner.scan(function(result) {
            $timeout(function() {
                var code = result.text;
                return result.cancelled ? void console.log(result.cancelled) : void beneficiaryData.validateQRCode(code, pin).then(function(voucher) {
                    var currentCodes = $scope.vouchers.map(function(v) {
                        return v.voucherCode;
                    }), beneficiary = $scope.vouchers[0].beneficiary;
                    return moment.unix(voucher.validAfter) > moment() ? void alert(translate(gettext("Voucher can't be used before")) + " " + moment.unix(voucher.validAfter).format("L") + ".") : voucher.beneficiary.BeneficiaryId != beneficiary.BeneficiaryId ? void alert(translate(gettext("Voucher belongs to a different beneficiary."))) : currentCodes.indexOf(voucher.voucherCode) > -1 ? void alert(translate(gettext("Voucher already added"))) : void $scope.vouchers.push(voucher);
                })["catch"](failFunction);
            });
        }, failFunction);
    }, $scope.cancel = function() {
        delete $scope.vouchers, delete $scope.pin, $scope.modal.hide(), $scope.deferred.reject();
    }, $scope.pay = function() {
        $scope.deferred.resolve($scope.vouchers), delete $scope.vouchers, delete $scope.pin, $scope.modal.hide();
    };
} ]), angular.module("talon.transaction").service("transactionData", [ "$http", "$localStorage", "$q", "talonRoot", "$timeout", "$cordovaFile", "$cordovaFileTransfer", "$settings", "transactionHistoryDB", "$rootScope", "cardLoadHistoryDB", "beneficiaryData", "httpUtils", "gettext", "$filter", function beneficiaryData($http, $localStorage, $q, talonRoot, $timeout, $cordovaFile, $cordovaFileTransfer, $settings, transactionHistoryDB, $rootScope, cardLoadHistoryDB, beneficiaryData, httpUtils, gettext, $filter) {
    function loadCurrentData(pin, data) {
        var failFunction = function(error) {
            throw console.log(error), error;
        };
        return beneficiaryData.readCardData(pin, data).then(function(card) {
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
        var def = $q.defer(), failFunction = function(error) {
            alert(error.message), def.reject([ -2, error ]);
        }, currentPayload = info.current, pendingPayload = info.pending, beneficiary = info.beneficiary, value = currentPayload[0] + pendingPayload[0] - amount, time = pendingPayload[0] > 0 ? pendingPayload[1].unix() : currentPayload[1];
        return value = Math.round(1e3 * value) / 1e3, $settings.hashApplication().then(function(hash) {
            var payload = "1933|" + value + "|" + time.toString(16);
            if (2 == $localStorage.authorizationData.tokenType) return alert(translate(gettext("You are logged in as an administrator. The POS mode is available for demo use only. The transaction will not be completed."))), 
            void def.resolve();
            if (time > currentPayload[1]) {
                var cardLoad = {
                    _id: beneficiary.BeneficiaryId + "-" + moment().unix(),
                    beneficiaryId: beneficiary.BeneficiaryId,
                    amount: pendingPayload[0],
                    date: moment().unix(),
                    distributionDate: pendingPayload[1].unix()
                };
                cardLoadHistoryDB.upsert(cardLoad._id, cardLoad);
            }
            $timeout(function() {
                def.notify("CARD"), beneficiaryData.updateCardData(payload, beneficiary.CardKey, pin, beneficiary.CardId).then(function(update) {
                    processTransaction({
                        type: 2,
                        beneficiaryId: beneficiary.BeneficiaryId,
                        amountCredited: amount,
                        amountRemaining: value,
                        date: moment().unix(),
                        checksum: hash
                    }).then(function() {
                        def.resolve();
                    })["catch"](failFunction);
                })["catch"](failFunction);
            }, 100);
        })["catch"](failFunction), def.promise;
    }
    function debitQRCodes(vouchers, beneficiary) {
        var def = $q.defer(), failFunction = function(error) {
            console.log("Failed!!!!"), def.resolve();
        };
        return $settings.hashApplication().then(function(hash) {
            if (2 == $localStorage.authorizationData.tokenType) return alert(translate(gettext("You are logged in as an administrator. The POS mode is available for demo use only. The transaction will not be completed."))), 
            void def.resolve();
            var promises = vouchers.map(function(v) {
                return processTransaction({
                    type: 3,
                    beneficiaryId: beneficiary.BeneficiaryId,
                    voucherCode: v,
                    date: moment().unix(),
                    checksum: hash
                });
            });
            $q.when(promises).then(function(results) {
                console.log(results), console.log("Transaction Processed!!!"), def.resolve();
            })["catch"](failFunction);
        })["catch"](failFunction), def.promise;
    }
    function processTransaction(transaction) {
        var def = $q.defer();
        return transaction.transactionCode = forge.util.bytesToHex(forge.random.getBytes(8)), transaction._id = transaction.beneficiaryId + "-" + transaction.date + "-" + transaction.transactionCode, 
        transaction.location = $rootScope.currentLocation, transaction.quarantine = !1, httpUtils.checkConnectivity().then(function() {
            console.log("Process Transaction Online");
            var url = 2 == transaction.type ? "ProcessNFCTransaction" : "ProcessQRTransaction";
            $http.post(talonRoot + "api/App/MobileClient/" + url, transaction).then(function(response) {
                return response.data && (response = response.data), response.Success ? (transaction.confirmationCode = response.ConfirmationCode, transactionHistoryDB.upsert(transaction._id, transaction), 
                void def.resolve()) : void def.reject(response.message);
            });
        })["catch"](function() {
            transaction.quarantine = !0, transactionHistoryDB.upsert(transaction._id, transaction), def.resolve();
        }), def.promise;
    }
    var translate = $filter("translate");
    return {
        processTransaction: processTransaction,
        loadCurrentData: loadCurrentData,
        debitCard: debitCard,
        debitQRCodes: debitQRCodes
    };
} ]);