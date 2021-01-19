angular.module('MyCubes.services.my-player', [])

    .factory('$myPlayer', function ($window, requestHandler, $log, mySocket, $rootScope) {

        var player = null;

        //check for user in local storage
        var localStoragePlayer = $window.localStorage.getItem('player');
        if (localStoragePlayer && isJson(localStoragePlayer)) {
            player = JSON.parse(localStoragePlayer);
            setSocketDetails();
        }

        //is json function
        function isJson(str) {
            try {
                JSON.parse(str);
            } catch (e) {
                return false;
            }
            return true;
        }

        //set socket id for user
        function setSocketDetails() {
            return new Promise(function (resolve, reject) {
                if (player && player.roomId) {
                    requestHandler.createRequest({
                        event: 'setSocketDetails',
                        params: {
                            user: player
                        },
                        onSuccess: function () {
                            $log.warn("successfully set socket details");
                            resolve();
                        },
                        onError: function (error) {
                            $log.error("failed to set socket details");
                            reject();
                        }
                    });
                }
            });
        }

        return {

            setSocketDetails: setSocketDetails,

            setRoomId: function (roomId) {
                player.roomId = roomId;
                $window.localStorage.setItem('player', JSON.stringify(player));

                //register the user for room notifications
                setSocketDetails();
            },

            //set player
            setPlayer: function (user) {
                player = user;
                $window.localStorage.setItem('player', JSON.stringify(user));
            },

            //set player to null
            setPlayerToNull: function () {
                player = null;
            },

            //get player
            getPlayer: function () {
                return player;
            },

            //get the player id
            getId: function () {
                if (player == null) {
                    return null;
                }
                return player.id;
            },

            isLoggedIn: function () {
                return player != null;
            },

            logout: function () {
                player = null;
                $window.localStorage.removeItem('player');
            },

            removeSocketEvents: function () {
                //remove socket listeners
                mySocket.getSocket().removeAllListeners();

                // setReconnectSocketEvent();
            }
        };
    });
