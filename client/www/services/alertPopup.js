angular.module('MyCubes.services.alert-popup', [])

    .factory('alertPopup', function ($ionicPopup, $timeout) {
        return function (title, subtitle, delay) {

            if (!title) {
                title = "Error occurred"
            }
            if (!subtitle) {
                subtitle = "Please try later";
            }

            //show popup
            var alertPopup = $ionicPopup.show({
                title: title,
                subTitle: subtitle
            });

            //close popup after X seconds
            $timeout(function () {
                alertPopup.close();
            }, delay ? delay : 2000);
        };
    });

