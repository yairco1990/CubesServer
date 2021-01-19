/**
 * Created by Yair on 10/11/2016.
 */
angular.module('MyCubes.controllers.register-page', [])

    .controller('RegisterCtrl', function ($scope, requestHandler, $http, $state, $ionicPopup, $myPlayer, $timeout, $log, $ionicHistory, alertPopup) {

        $log.debug("init register ctrl");

        //init player
        $scope.player = {};

        /**
         * register
         */
        $scope.register = function () {

            if ($scope.player.password == $scope.player.password2) {

                //validate name and password
                requestHandler.createRequest({
                    event: 'register',
                    params: {
                        username: $scope.player.username,
                        password: $scope.player.password
                    },
                    onSuccess: function (user) {
                        $log.debug("successfully registered");

                        //set the player to the service
                        $myPlayer.setPlayer(user);

                        //show success popup
                        var registerPopup = $ionicPopup.show({
                            title: 'Successfully registered!'
                        });

                        //close popup after 3 seconds and move to dashboard
                        $timeout(function () {
                            registerPopup.close();

                            //set new root of history to the dashboard page
                            $ionicHistory.nextViewOptions({historyRoot: true});

                            //move to dashboard page
                            $state.go('dashboard', {reload: true});
                        }, 500);
                    },
                    onError: function (error) {

                        $log.error("failed to register", error);

                        if (error == "ALREADY_EXIST") {
                            //show success popup
                            var registerPopup = $ionicPopup.alert({
                                title: 'Failed to register',
                                subTitle: 'User with this name already exist'
                            });
                            registerPopup.then(function (res) {
                            });
                        } else {
                            alertPopup();
                        }
                    }
                });
            } else {
                $log.error("passwords are not identical")
            }
        };

        /**
         * move to register page
         */
        $scope.moveToLogin = function () {

            //set new root of history to the login page
            $ionicHistory.nextViewOptions({historyRoot: true});

            $state.go('login');
        };

    });
