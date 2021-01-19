/**
 * Created by Yair on 10/11/2016.
 */
angular.module('MyCubes.directives.input', [])

    .directive('myInput', function () {
        return {
            restrict: 'E',
            templateUrl: 'directives/input/input.html',
            scope: {
                ngModel: "=",
                placeholder: "@",
                icon: "@",
                type: "@"
            }
        }
    });
