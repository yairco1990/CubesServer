/**
 * Created by Yair on 10/11/2016.
 */
angular.module('MyCubes.controllers.game-page', [])

    .controller('GameCtrl', GameCtrl);

function GameCtrl($stateParams, $state, $myPlayer, $log, $ionicPopup, $timeout, mySocket, requestHandler, $ionicPlatform, $scope, alertPopup, $interval) {

    var vm = this;

    vm.$stateParams = $stateParams;
    vm.$state = $state;
    vm.$myPlayer = $myPlayer;
    vm.$log = $log;
    vm.$ionicPopup = $ionicPopup;
    vm.$timeout = $timeout;
    vm.mySocket = mySocket;
    vm.requestHandler = requestHandler;
    vm.$ionicPlatform = $ionicPlatform;
    vm.$scope = $scope;
    vm.alertPopup = alertPopup;
    vm.$interval = $interval;

    vm.initController();
}

/**
 * init room
 */
GameCtrl.prototype.initController = function () {

    var vm = this;

    vm.showUsersCubes = false;
    vm.messages = [];
    vm.messagesCopy = [];
    vm.unreadMessages = 0;

    vm.$log.debug("init room ctrl");

    //general update
    vm.mySocket.getSocket().on(pushCase.UPDATE_GAME, function () {
        vm.$log.info("PUSH RECEIVED:", pushCase.UPDATE_GAME);
        vm.getGame();
    });

    //player said bluff
    vm.mySocket.getSocket().on(pushCase.SAID_BLUFF, function (bluffedUser) {
        vm.$log.info("PUSH RECEIVED:", pushCase.SAID_BLUFF);
        vm.bluffedUser = bluffedUser;
    });

    //player won the game
    vm.mySocket.getSocket().on(pushCase.PLAYER_WON, function (winnerPlayer) {
        vm.$log.info("PUSH RECEIVED:", pushCase.PLAYER_WON);
        vm.$timeout(function () {
            vm.showWinnerPopup(winnerPlayer);
        }, 3000);
    });

    //in case that session end
    vm.mySocket.getSocket().on(pushCase.SESSION_ENDED, function (data) {
        vm.$log.info("PUSH RECEIVED:", pushCase.SESSION_ENDED);
        vm.onRoundEnded(data.users, data.endRoundResult, data.isUserLeft);
    });

    //in case that some user gambled
    vm.mySocket.getSocket().on(pushCase.PLAYER_GAMBLED, function () {
        vm.$log.info("PUSH RECEIVED:", pushCase.PLAYER_GAMBLED);
        vm.getGame();
    });

    //in case of game over
    vm.mySocket.getSocket().on(pushCase.GAME_OVER, function (data) {
        vm.$log.info("PUSH RECEIVED:", pushCase.GAME_OVER);
        // refresh game
        vm.onRoundEnded(data.users, data.endRoundResult, data.isUserLeft);
    });

    //in case of game restarted
    vm.mySocket.getSocket().on(pushCase.GAME_RESTARTED, function () {
        vm.$log.info("PUSH RECEIVED:", pushCase.GAME_RESTARTED);
        vm.alertPopup("Game Restarted", "Good Luck!", 3000);
        // refresh game
        vm.getGame(true);
    });

    //handle user reconnect
    vm.mySocket.getSocket().on("connect", function () {
        vm.$log.info("player reconnected - send socket id(room page)");
        // refresh game
        vm.setSocketDetails();
    });

    //in case of new message
    vm.mySocket.getSocket().on(pushCase.NEW_MESSAGE, function (message) {
        vm.$log.info("PUSH RECEIVED:", pushCase.NEW_MESSAGE);
        vm.handleNewMessage(message);
    });

    //in case of user set auto lye
    vm.mySocket.getSocket().on(pushCase.SET_AUTO_LIE, function (data) {
        vm.$log.info("PUSH RECEIVED:", pushCase.SET_AUTO_LIE);
        vm.updateUserWithAutoLie(data);
    });

    //back button event function
    var doCustomBack = function () {
        vm.returnToRooms();
    };

    // registerBackButtonAction() returns a function which can be used to deregister it
    var deregisterHardBack = vm.$ionicPlatform.registerBackButtonAction(
        doCustomBack, 101
    );

    vm.$scope.$on('$destroy', function () {
        deregisterHardBack();
    });

    vm.roomId = parseInt(vm.$stateParams.roomId);
    vm.showUserPanel = true;
    vm.showMyDice = true;
    vm.diceStatusButton = "Hide";
    vm.pageTitle = vm.$stateParams.roomName;

    //TODO for debug only
    vm.showRestartButton = false;

    vm.getGame(true);

    //TODO messages interval
    vm.intervalObject = vm.$interval(function () {
        //if there is a message to show
        if (vm.messagesCopy[0]) {
            vm.lastMessage = vm.getMessageText(angular.copy(vm.messagesCopy[0]), true);
            vm.showGameMessage = true;
            vm.messagesCopy.splice(0, 1);
        } else {
            vm.showGameMessage = false;
        }
    }, 4000);

    vm.$scope.$on('$destroy', function () {
        vm.$log.info("scope destroyed");
        vm.$interval.cancel(vm.intervalObject);
    });
};

/**
 * when round ended - show cubes and restart the game after X time
 */
GameCtrl.prototype.onRoundEnded = function (users, endRoundResult, isUserLeft) {

    var vm = this;

    vm.bluffedUser = null;

    //that's mean that now only one player(2 is before he quit) left in the room
    if (isUserLeft && users && users.length == 2) {
        vm.getGame();
        return;
    }

    vm.users = users;
    vm.endRoundResult = endRoundResult;

    vm.parseUsersObject(vm.users);

    //sort the user's cubes
    vm.users.forEach(function (user) {
        if (user.cubes) {
            user.cubes.sort(function (cube) {
                if (cube.cubeNum == 1 || cube.cubeNum == vm.room.lastGambleCube) {
                    return -1;
                } else {
                    return 1;
                }
            });
        }
    });

    //show all users cubes
    vm.showUsersCubes = true;

    //calc time of waiting
    var timeToWait = vm.room.numOfCubes * 1000;
    timeToWait = timeToWait < 6000 || isUserLeft ? 6000 : timeToWait;

    //max 10 second
    if (timeToWait > 10000) {
        timeToWait = 10000;
    }

    if (isUserLeft && !vm.playerReturnToRooms) {
        //update user left
        //show success popup
        var alertPopup = vm.$ionicPopup.show({
            title: 'Player left the room. Restart the round.'
        });

        //close popup after 3 seconds
        vm.$timeout(function () {
            alertPopup.close();
        }, 4000);

        timeToWait = 5000;
    }

    //set time out for cubes preview
    vm.$timeout(function () {
        vm.endRoundResult = null;
        vm.getGame(true);
    }, timeToWait);
};

/**
 * get game details - users, room state and cubes.
 */
GameCtrl.prototype.getGame = function (isStartOfRound) {

    var vm = this;

    //get the game request
    vm.requestHandler.createRequest({
        event: 'getGame',
        params: {
            roomId: vm.roomId,
            userId: vm.$myPlayer.getId()
        },
        onSuccess: function (result) {
            vm.$log.debug("successfully get game", result);

            vm.showUsersCubes = false;
            vm.users = result.users;
            vm.room = result.room;
            vm.showAutoLie = true;

            if (isStartOfRound) {
                vm.startRoundUserId = vm.room.currentUserTurnId;

                vm.showMyDice = true;
                vm.isAutoLie = false;
                vm.diceStatusButton = "Hide";
            }

            vm.parseUsersObject(vm.users);

            //set page name
            vm.pageTitle = vm.room.name;

            //check if i am the current turn
            vm.isMyTurn = vm.room.currentUserTurnId == vm.$myPlayer.getId();

            //set gambling to minimum
            vm.setGambleToMinimum();

            vm.showUserPanel = true;

            vm.endRoundResult = null;
            vm.bluffedUser = null;

            // Stop the ion-refresher from spinning
            vm.$scope.$broadcast('scroll.refreshComplete');

            //if its my turn and I set autolie - send the lye request
            if (vm.isMyTurn && vm.isAutoLie) {
                //hide the user panel and say false, like he committed.
                vm.isMyTurn = false;
                vm.showAutoLie = false;
                vm.$timeout(function () {
                    vm.setGamble(null, null, true);
                }, 3000);
            }
        },
        onError: function (error) {
            vm.$log.error("failed to get game", error);
        }
    });

};

/**
 * parse user object
 */
GameCtrl.prototype.parseUsersObject = function (users) {

    var vm = this;

    //sort the users
    users = vm.sortUsers(users, vm.startRoundUserId);

    users.forEach(function (user) {
        //check who is me
        if (user.id == vm.$myPlayer.getId()) {
            user.isMe = true;
            vm.myPlayer = user;
        } else {
            user.isMe = false;
        }

        //check who current user turn
        user.currentUser = user.id == vm.room.currentUserTurnId;

        //check who last user turn
        user.lastUser = user.id == vm.room.lastUserTurnId;
    });
};

/**
 * sort users
 * @param users
 * @param currentUsrTurnId
 */
GameCtrl.prototype.sortUsers = function (users, currentUsrTurnId) {

    var newUsersList = [];
    var key = 1;

    //get start user
    var currentUser = MyUtils.getUserById(users, currentUsrTurnId);

    //until everybody is in the list
    while (!MyUtils.isInTheList(newUsersList, currentUser) && currentUser) {
        currentUser.key = key++;

        newUsersList.push(currentUser);

        currentUser = MyUtils.getUserById(users, currentUser.nextUserTurnId);
    }

    //insert the off players
    users.forEach(function (user) {
        if (!user.isLoggedIn) {
            user.key = key++;
            newUsersList.push(user);
        }
    });

    return newUsersList;
};

/**
 * send gamble
 */
GameCtrl.prototype.setGamble = function (gambleTimes, gambleCube, isLying) {

    var vm = this;

    vm.showUserPanel = false;
    vm.isMyTurn = false;

    //send gamble request
    vm.requestHandler.createRequest({
        event: 'setGamble',
        params: {
            userId: vm.$myPlayer.getId(),
            roomId: vm.roomId,
            gambleTimes: gambleTimes,
            gambleCube: gambleCube,
            isLying: isLying
        },
        onSuccess: function (result) {

            vm.$log.debug("successfully sent gamble");

            if (isLying) {

                if (result == "CORRECT_GAMBLE") {

                    vm.showAlert("You wrong!", "The gamble was correct!", "red");
                } else if (result == "WRONG_GAMBLE") {

                    vm.showAlert("You right!", "He is a bluffer!", "green");
                }
            }
        },
        onError: function (error) {

            vm.$log.error("failed to set gamble due to", error);

            vm.$timeout(function () {
                vm.getGame();
            }, 500);
        }
    });
};

/**
 * return to rooms page
 */
GameCtrl.prototype.returnToRooms = function (force) {

    var vm = this;

    //if the user click exit on the popup
    if (force || vm.users.length < 2) {

        vm.playerReturnToRooms = true;

        vm.requestHandler.createRequest({
            event: 'exitRoom',
            params: {
                userId: vm.$myPlayer.getId()
            },
            onSuccess: function () {
                vm.$log.debug("game restarted successfully");

                //remove socket listeners
                vm.$myPlayer.removeSocketEvents();
            },
            onError: function () {
                vm.$log.debug("failed to restart the game");
            }
        });
        //move to rooms page
        vm.$state.go('rooms');
    } else {
        //ask the user if he want to exit
        vm.$ionicPopup.show({
            title: 'Are you sure you want to leave the room?',
            buttons: [
                {
                    text: 'Stay',
                    type: 'button-positive'
                },
                {
                    text: 'Leave',
                    type: 'button-assertive',
                    onTap: function () {
                        vm.returnToRooms(true);
                    }
                }
            ]
        });
    }
};

/**
 * restart room
 */
GameCtrl.prototype.restartGame = function () {
    var vm = this;

    //get the game request
    vm.requestHandler.createRequest({
        event: 'restartGame',
        params: {
            roomId: vm.roomId,
            userId: vm.$myPlayer.getId()
        },
        onSuccess: function () {
            vm.$log.debug("game restarted successfully");
        },
        onError: function () {
            vm.$log.debug("failed to restart the game");
        }
    });
};

GameCtrl.prototype.sendMessage = function () {
    var vm = this;

    if (vm.messageContent) {
        //get the game request
        vm.requestHandler.createRequest({
            event: 'sendMessage',
            params: {
                userId: vm.$myPlayer.getId(),
                content: vm.messageContent
            },
            onSuccess: function () {
                vm.messageContent = "";
                vm.$log.debug("message successfully sent");
            },
            onError: function () {
                vm.$log.debug("failed to send message");
            }
        });
    }
};

/**
 * send socket id
 */
GameCtrl.prototype.setSocketDetails = function () {
    var vm = this;

    vm.$myPlayer.setSocketDetails().then(function () {
        vm.getGame();
    }).catch(function (err) {
        vm.$log.error(err);
    });
};

/**
 * show alert
 */
GameCtrl.prototype.showAlert = function (title, description, color) {

    var vm = this;

    var alertPopup = vm.$ionicPopup.show({
        title: title,
        template: "<style>.popup-head { background-color:" + color + " !important; }</style><p>" + description + "<p/>"
    });

    vm.$timeout(function () {
        alertPopup.close();
    }, 1500);
};

GameCtrl.prototype.getGambleTimes = function () {
    var vm = this;

    if (vm.gambleTimes == null) {
        vm.gambleTimes = 1;
    }
    return vm.gambleTimes;
};
GameCtrl.prototype.getGambleCube = function () {

    var vm = this;

    if (vm.gambleCube == null) {
        vm.gambleCube = 2;
    }
    return vm.gambleCube;
};

/**
 * set gamble to minimum option
 */
GameCtrl.prototype.setGambleToMinimum = function () {

    var vm = this;

    var minimumGable = vm.getNextMinimumGamble();

    vm.gambleCube = minimumGable.gambleCube;
    vm.gambleTimes = minimumGable.gambleTimes;
};

/**
 * get the next minimum gamble that possible
 * @returns {*}
 */
GameCtrl.prototype.getNextMinimumGamble = function () {
    var vm = this;

    var room = vm.room;

    //if there is a gamble
    if (room != null && room.lastGambleCube != null && room.lastGambleTimes != null) {
        //if the current gamble is 6, must to increase the times
        if (room.lastGambleCube == 6) {
            return {
                gambleTimes: room.lastGambleTimes + 1,
                gambleCube: 2 //min cube
            };
        }
        // if its not 6
        return {
            gambleTimes: room.lastGambleTimes,
            gambleCube: room.lastGambleCube + 1
        };
    }
    //if there is no gamble yet
    return {
        gambleTimes: 1,
        gambleCube: 2
    };
};

/**
 * get dice image
 * @param cubeNum
 * @returns {string}
 */
GameCtrl.prototype.getCubeImage = function (cubeNum) {
    var vm = this;

    return "img/cube-" + cubeNum + ".png";
};
/**
 * get my dice image
 * @param cubeNum
 * @returns {*}
 */
GameCtrl.prototype.getMyCubeImage = function (cubeNum) {
    var vm = this;

    if (!vm.showMyDice) {
        return "img/blank-dice.png";
    } else {
        return vm.getCubeImage(cubeNum);
    }
};

GameCtrl.prototype.isMe = function (user) {
    var vm = this;

    return user.id == vm.$myPlayer.getId();
};

GameCtrl.prototype.getMessageText = function (message, isLastMessage) {

    var vm = this;

    var classes = "";
    if (message.userId == vm.$myPlayer.getId()) {
        classes = "message-its-me";
    }

    if (isLastMessage) {
        classes = "last-message-sender";
    }

    var text = "<label class='message-sender " + classes + "'>" + message.name + "</label>:" + "<label class='message-content'>&nbsp" + message.content + "</label>";

    return text;
};

GameCtrl.prototype.getEndRoundTextResult = function () {
    var vm = this;

    var text = "";

    if (vm.endRoundResult) {
        var isRightText = vm.endRoundResult.isRight ? " WON!" : "LOST!";
        var isRightClass = vm.endRoundResult.isRight ? 'gamble-summarize-right' : 'gamble-summarize-wrong';

        text = "<label class='gamble-summarize-name'>" + vm.endRoundResult.sayLying + "</label> gambled that " + "<p class='gamble-summarize'>" + vm.endRoundResult.gambleTimes +
            " times of " + vm.endRoundResult.gambleCube + "</p>" + " it's a bluff and he " + "<label class='" + isRightClass + "'>" + isRightText + "</label>";
    }

    return text;
};

/**
 * get total dice
 * @returns {number}
 */
GameCtrl.prototype.getNumOfTotalDice = function () {
    var vm = this;

    var numOfTotalCubes = 0;

    if (vm.users) {
        vm.users.forEach(function (user) {
            if (user.currentNumOfCubes) {
                numOfTotalCubes += user.currentNumOfCubes;
            }
        });
    }

    return numOfTotalCubes;
};

/**
 * chat opened or closed
 * @param isOn
 */
GameCtrl.prototype.setChatStatus = function (isOn) {
    var vm = this;

    //set on or off
    vm.chatOn = isOn;

    if (isOn) {
        //if opened - zero the messages counter
        vm.unreadMessages = 0;
    }
};

/**
 * handle new message
 * @param message
 */
GameCtrl.prototype.handleNewMessage = function (message) {
    var vm = this;

    //insert the new message to the chat
    vm.messages.push(message);
    vm.messagesCopy.push(message);

    //set unread messages counter
    if (!vm.chatOn) {
        vm.unreadMessages++;
    }

    //remove old messages to improve performance
    if (vm.messages.length > 20) {
        vm.messages.splice(0, 1);
    }

    //if the interval is empty - show the new message
    if (!vm.showGameMessage) {
        vm.lastMessage = vm.getMessageText(angular.copy(message), true);
        vm.showGameMessage = true;
    }
};

/**
 * show winner popup
 */
GameCtrl.prototype.showWinnerPopup = function (winner) {
    var vm = this;

    vm.alertPopup("The Winner Is " + winner.name, "Good Game!", 4500);
};

/**
 * set auto lye
 */
GameCtrl.prototype.setAutoLie = function () {
    var vm = this;

    vm.requestHandler.createRequest({
        event: 'setAutoLie',
        params: {
            isAutoLie: vm.isAutoLie
        },
        onSuccess: function () {
            vm.$log.debug("successfully setAutoLie");
        },
        onError: function (error) {
            vm.$log.error("failed to setAutoLie", error);
        }
    });
};

/**
 * set user with auto lye
 */
GameCtrl.prototype.updateUserWithAutoLie = function (data) {
    var vm = this;

    vm.users.forEach(function (player) {
        //find the user
        if (player.id == data.userId) {
            //set auto lye property
            player.isAutoLie = data.isAutoLie;
        }
    });
};

/////////////////////////////////////////increase and decrease gambling details - works very good until 21/2/2017!/////////////////////////////////////////////////
GameCtrl.prototype.canDecreaseCube = function () {
    var vm = this;

    //can decrease the cube number when the times of current gamble is higher than the selected
    //or the times is equals but the selected cube is higher than the current gamble cube
    return vm.gambleCube > 2 &&
        (vm.gambleTimes > vm.getNextMinimumGamble().gambleTimes ||
        (vm.gambleTimes == vm.getNextMinimumGamble().gambleTimes && vm.gambleCube > (vm.getNextMinimumGamble().gambleCube)));
};

GameCtrl.prototype.canDecreaseTimes = function () {
    var vm = this;

    //when the gamble times is lower than the selected one
    return vm.gambleTimes > 1 && (vm.gambleTimes > vm.getNextMinimumGamble().gambleTimes);
};
GameCtrl.prototype.increaseTimes = function () {
    var vm = this;

    vm.gambleTimes++;
};
GameCtrl.prototype.decreaseTimes = function () {
    var vm = this;

    if (vm.gambleTimes > 1 && vm.canDecreaseTimes()) {
        vm.gambleTimes--;
        //if the cube is lower and the times become to be equlas - set to minimum
        if (vm.gambleTimes == vm.room.lastGambleTimes && vm.gambleCube <= vm.room.lastGambleCube) {
            vm.setGambleToMinimum();
        }
    }
};
GameCtrl.prototype.increaseCube = function () {
    var vm = this;

    if (vm.gambleCube < 6) {
        vm.gambleCube++;
    }
};
GameCtrl.prototype.decreaseCube = function () {
    var vm = this;

    if (vm.gambleCube > 2 && vm.canDecreaseCube()) {
        vm.gambleCube--;
    }
};
