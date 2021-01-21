
angular.module('MyCubes.directives.focusMe', [])

.directive('focusMe', function ($timeout) {
    return {
        scope: {
            focusValue: "=focusMe"
        },
        link: function (scope, element, attrs) {
            if (scope.focusValue) {
                $timeout(function () {
                    element[0].focus();

                    element.on('blur', function() {
                        element[0].focus();
                    });
                });
            }
        }
    };
});
