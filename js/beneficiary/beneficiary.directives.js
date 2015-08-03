angular.module('talon.beneficiary')

.directive('ionSearch', function () {
        return {
            restrict: 'E',
            replace: true,
            scope: {
                getData: '&source',
                model: '=?',
                search: '=?filter'
            },
            link: function (scope, element, attrs) {
                attrs.minLength = attrs.minLength || 0;
                scope.placeholder = attrs.placeholder || '';
                scope.search = {
                    value: ''
                };

                if (attrs.class)
                    element.addClass(attrs.class);

                if (attrs.source) {
                    scope.$watch('search.value', function (newValue, oldValue) {
                        if (newValue.length > attrs.minLength) {
                            scope.getData({
                                str: newValue
                            }).then(function (results) {
                                scope.model = results;
                            });
                        } else {
                            scope.model = [];
                        }
                    });
                }

                scope.clearSearch = function () {
                    scope.search.value = '';
                };
            },
            template: '<div class="item-input-wrapper">' +
                '<i class="icon ion-android-search"></i>' +
                '<input type="search" placeholder="{{placeholder}}" ng-model="search.value">' +
                '<i ng-if="search.value.length > 0" ng-click="clearSearch()" class="icon ion-close"></i>' +
                '</div>'
        };
    })
    .directive('signaturePad', function ($timeout) {
        return {
            restrict: 'E',
            scope: {
                model: '=',
                cancelled: '=',
                accepted: '=',
                isOpen: '='
            },
            link: function (scope, element, attrs) {
                scope.acceptSignature = function getSignature() {
                    if (scope.accepted) {
                        scope.accepted($("#signature-pad", element).jSignature('getData', 'svgbase64'));
                    }
                };
                scope.closeDialog = function closeDialog() {
                    if (scope.cancelled) {
                        scope.cancelled();
                    }
                };
                scope.clearSignature = function clearSignature() {
                    $("#signature-pad", element).jSignature('reset');
                };
                var created = false;

                scope.$watch('isOpen',
                    function () {
                        if (scope.isOpen) {
                            if (!created) {
                                $("#signature-pad").jSignature();
                                created = true;
                            }
                            if ($("#signature-pad", element).children().length == 0) {
                                $("#signature-pad", element).jSignature('reset');
                            }
                        }
                    });

            },
            template: '<div id="signature-pad" style="height:60%; overflow: hidden;">' +
                '</div>' +
                '<div class="row">' +
                '<div class="col"><button class="button button-assertive button-block" ng-click="closeDialog()">Cancel</button></div>' +
                '<div class="col"><button class="button button-stable button-block" ng-click="clearSignature()">Clear</button></div>' +
                '<div class="col"></div>' +
                '<div class="col"></div>' +
                '<div class="col"><button class="button button-positive button-block" ng-click="acceptSignature()">Accept</button></div>' +
                '</div>'
        };
    })

;
