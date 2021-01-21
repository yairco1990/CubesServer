/**
 * Created by Yair on 10/11/2016.
 */
angular.module('MyCubes.directives.loader', [])

    .directive('loader', function () {
        return {
            restrict: 'AE',
            templateUrl: 'directives/loader/loader.html',
            scope: {
                isLoaded: "=",
                loadingText: "@"
            }
        }
    });
