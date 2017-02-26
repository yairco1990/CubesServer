//utils library
var Utils = require('../utils/utils');

var DBManager = require('../dal/DBManager');

function GameLogic() {
    this.DBManager = DBManager.getDBManager();
}

/**
 * restart room
 * @param winnerId
 * @param roomId
 * @param sockets
 * @param pushType
 * @param callback
 */
GameLogic.prototype.restartGame = function (winnerId, roomId, sockets, pushType, endRoundResult, callback) {

    var self = this;

    //get the room
    self.DBManager.getRoomById(roomId).then(function (room) {

        //get the users of the room
        self.DBManager.getUsersByRoomId(roomId).then(function (users) {

            if (users.length > 1) {

                //clear the room cubes
                self.DBManager.clearRoomCubes(roomId).then(function () {

                    //set 5 cubes for all users in room
                    Promise.all(self.setCubesForUsersInRoom(users, room.initialCubeNumber)).then(function () {

                        var usersPromises = [];

                        //set users turns
                        users = self.setTurnsOrder(users);

                        //update num of cubes for each user
                        users.forEach(function (user) {
                            user.currentNumOfCubes = room.initialCubeNumber;
                            user.isLoggedIn = true;
                        });

                        //save the users
                        self.DBManager.saveUsers(users).then(function () {

                            //set room details
                            room.currentUserTurnId = winnerId ? winnerId : users[0].id;
                            room.lastGambleCube = null;
                            room.lastGambleTimes = null;

                            self.DBManager.saveRoom(room).then(function () {
                                console.log("FINISH TO RESTART THE ROOM!");

                                pushType = pushType ? pushType : Utils.pushCase.GAME_RESTARTED;

                                //send push for all the room's users
                                self.DBManager.pushForRoomUsers(sockets, pushType, roomId, endRoundResult);

                                callback({
                                    response: Utils.serverResponse.SUCCESS,
                                    result: "no data"
                                })
                            });
                        });
                    });
                });
            } else {
                callback({
                    response: Utils.serverResponse.ERROR,
                    result: "there is just one user or less in the room"
                })
            }
        });
    });
};

GameLogic.prototype.setCubesForUsersInRoom = function (users, numOfCubes) {

    var self = this;

    var promises = [];

    users.forEach(function (user) {

        numOfCubes = numOfCubes ? numOfCubes : user.currentNumOfCubes;
        for (var i = 0; i < numOfCubes; i++) {
            var cube = {
                cubeNum: Math.floor((Math.random() * 6) + 1),
                roomId: user.roomId,
                userId: user.id
            };

            promises.push(self.DBManager.Cube.create(cube));
        }
    });

    return promises;
};

/**
 * login function
 * @param roomId
 * @param callback
 * @param userId
 */
GameLogic.prototype.getGame = function (roomId, userId, callback) {

    var self = this;

    self.DBManager.getRoomById(roomId).then(function (room) {

        self.DBManager.getUsersByRoomId(roomId, userId).then(function (users) {

            if (users != "NO_ROWS_FOUND" && room != "NO_ROWS_FOUND") {
                callback({
                    response: Utils.serverResponse.SUCCESS,
                    result: {
                        users: users,
                        room: room
                    }
                });
            } else {
                callback({
                    response: Utils.serverResponse.ERROR,
                    result: "NO_USERS_OR_ROOM"
                });
            }
        });
    });
};

/**
 * restart the round
 * @param roomId
 * @param sockets
 * @param numOfUsersInRoom
 */
GameLogic.prototype.restartRound = function (roomId, sockets, numOfUsersInRoom, data) {

    var self = this;

    //get room
    self.DBManager.getRoomById(roomId).then(function (room) {

        //clear cubes
        self.DBManager.clearRoomCubes(roomId).then(function () {

            //get users
            self.DBManager.getUsersByRoomId(roomId).then(function (users) {

                //set cubes only if two or more playing
                if (numOfUsersInRoom > 1) {
                    //set cubes for users in room
                    Promise.all(self.setCubesForUsersInRoom(users, null)).then(function () {

                        //update the users
                        self.DBManager.pushForRoomUsers(sockets, Utils.pushCase.SESSION_ENDED, room.id, data);
                    });
                } else {
                    self.DBManager.pushForRoomUsers(sockets, Utils.pushCase.SESSION_ENDED, room.id, data);
                }
            });
        });
    });
};

GameLogic.prototype.setGamble = function (userId, roomId, gambleTimes, gambleCube, isLying, callback, sockets) {

    var self = this;

    var result;

    //get current user
    self.DBManager.getUserById(userId).then(function (user) {
        //get room
        self.DBManager.getRoomById(roomId).then(function (room) {
            //get users in room
            self.DBManager.getUsersByRoomId(roomId).then(function (users) {

                //set original users for sending all user's cubes to all the users
                var originalUsers = JSON.parse(JSON.stringify(users));

                //if the current user set lie - check last gamble
                if (isLying) {
                    //get the last gamble
                    var lastGambleTimes = room.lastGambleTimes;
                    var lastGambleCube = room.lastGambleCube;

                    var endRoundResult = {
                        sayLying: user.name,
                        gambleCube: lastGambleCube,
                        gambleTimes: lastGambleTimes
                    };

                    var correctCubesCounter = 0;

                    //start from -1, because someone need to drop cube
                    var allCubesCounter = -1;

                    users.forEach(function (userInRoom) {

                        //iterate over the users cubes
                        userInRoom.cubes.forEach(function (cube) {

                            allCubesCounter++;

                            //if the cube num equals to the gamble or equals to 1 - add to counter
                            if (cube.cubeNum == lastGambleCube || cube.cubeNum == 1) {
                                correctCubesCounter++;
                            }
                        });
                    });

                    var wrongGamblerId = null;

                    //check if the gamble correct or not
                    if (lastGambleTimes > correctCubesCounter) {
                        endRoundResult.isRight = true;

                        //if wrong gamble - minus cube to last user
                        wrongGamblerId = room.lastUserTurnId;

                        result = "WRONG_GAMBLE";
                    } else {
                        endRoundResult.isRight = false;

                        //if good gamble - minus cube to current user
                        wrongGamblerId = room.currentUserTurnId;

                        result = "CORRECT_GAMBLE";
                    }

                    //set room details
                    room.numOfCubes = allCubesCounter;
                    room.lastGambleCube = null;
                    room.lastGambleTimes = null;
                    room.lastUserTurnId = null;
                    room.currentUserTurnId = wrongGamblerId;

                    //get the loser
                    self.DBManager.getUserById(wrongGamblerId).then(function (wrongGambler) {

                        //minus cube for the loser
                        wrongGambler.currentNumOfCubes--;

                        //check game over for this user
                        if (wrongGambler.currentNumOfCubes < 1) {
                            wrongGambler.isLoggedIn = false;
                            users = Utils.removeFromArray(users, wrongGambler);
                            room.currentUserTurnId = wrongGambler.nextUserTurnId;

                            users = self.setTurnsOrder(users);
                        }

                        //save users
                        self.DBManager.saveUsers(users).then(function () {

                            //save the room
                            self.DBManager.saveRoom(room).then(function () {

                                //save the gambler
                                self.DBManager.saveUser(wrongGambler).then(function () {

                                    //get the updated room
                                    self.DBManager.getUsersByRoomId(roomId).then(function (updatedUsers) {

                                        //clear room's cubes
                                        self.DBManager.clearRoomCubes(roomId).then(function () {
                                            var userCounter = 0;
                                            //set gambles to null
                                            updatedUsers.forEach(function (updatedUser) {
                                                updatedUser.gambleCube = null;
                                                updatedUser.gambleTimes = null;

                                                //save user
                                                self.DBManager.saveUser(updatedUser).then(function () {

                                                    //set user cubes if still playing
                                                    if (updatedUser.isLoggedIn) {
                                                        Promise.all(self.setCubesForUser(updatedUser)).then(function () {
                                                            console.log("set cubes for user - ", updatedUser.name);
                                                            userCounter++;
                                                            if (userCounter == self.getPlayingUsers(updatedUsers).length) {

                                                                //get the winner
                                                                var winner = self.isGameOver(updatedUsers);

                                                                var usersData = {
                                                                    users: originalUsers,
                                                                    endRoundResult: endRoundResult
                                                                };

                                                                if (winner != null) {
                                                                    //init the room
                                                                    self.restartGame(winner.id, roomId, sockets, Utils.pushCase.GAME_OVER, usersData);
                                                                } else {
                                                                    self.DBManager.pushForRoomUsers(sockets, Utils.pushCase.SESSION_ENDED, roomId, usersData);
                                                                }
                                                                callback({
                                                                    response: Utils.serverResponse.SUCCESS,
                                                                    result: result
                                                                });
                                                            }
                                                        });
                                                    }
                                                });
                                            })
                                        });
                                    });
                                })
                            });
                        });
                    });
                } else {
                    user.gambleCube = gambleCube;
                    user.gambleTimes = gambleTimes;

                    //save the user
                    self.DBManager.saveUser(user).then(function () {
                        room.lastGambleCube = gambleCube;
                        room.lastGambleTimes = gambleTimes;
                        room.lastUserTurnId = user.id;
                        room.currentUserTurnId = user.nextUserTurnId;

                        //save the room
                        self.DBManager.saveRoom(room).then(function () {
                            self.DBManager.pushForRoomUsers(sockets, Utils.pushCase.PLAYER_GAMBLED, roomId);
                            callback({
                                response: Utils.serverResponse.SUCCESS,
                                result: {}
                            });
                        });
                    })
                }
            });
        });
    });
};

/**
 * check if the game is over
 */
GameLogic.prototype.initRoom = function (winner, room, users) {
    var self = this;

    room.currentUserTurnId = winner.id;
    room.numOfCubes = 10;

    //clear room cubes
    self.DBManager.clearRoomCubes(room.id).then(function () {
        //save the updated room
        self.DBManager.saveRoom(room).then(function () {

            var usersToSave = [];

            users.forEach(function (user) {
                user.gambleCube = null;
                user.gambleTimes = null;
                user.currentNumOfCubes = room.initialCubeNumber;

                usersToSave.push(self.DBManager.saveUser(user));

                Promise.all(self.setCubesForUser(user)).then(function () {

                });
            });

            //save users
            Promise.all(usersToSave).then(function () {
                console.log("users saved successfully");
            });
        });
    });

};


/**
 * send message to room's users
 */
GameLogic.prototype.sendMessage = function (userId, content, sockets, callback) {
    var self = this;

    self.DBManager.getUserById(userId).then(function (user) {
        self.DBManager.getRoomById(user.roomId).then(function (room) {
            var message = {
                userId: userId,
                name: user.name,
                content: content
            };

            callback({
                response: Utils.serverResponse.SUCCESS,
                result: message
            });

            self.DBManager.pushForRoomUsers(sockets, Utils.pushCase.NEW_MESSAGE, room.id, message);
        });
    });
};

/**
 * check if the game is over
 * @param users
 * @returns winner if exist or null
 */
GameLogic.prototype.isGameOver = function (users) {
    var numOfUserPlaying = 0;
    var winner = null;
    users.forEach(function (user) {
        if (user.currentNumOfCubes > 0) {
            numOfUserPlaying++;
            winner = user;
        }

        if (numOfUserPlaying > 1) {
            winner = null;
        }
    });
    return winner;
};

/**
 * set cubes for user accordingly to his number of cubes
 * @param user
 * @param callback
 * @returns array of promises
 */
GameLogic.prototype.setCubesForUser = function (user, callback) {

    var self = this;

    var promises = [];

    for (var i = 0; i < user.currentNumOfCubes; i++) {
        var cube = {
            cubeNum: Math.floor((Math.random() * 6) + 1),
            roomId: user.roomId,
            userId: user.id
        };
        promises.push(self.DBManager.Cube.create(cube));
    }

    return promises;
};

/**
 * set turns order
 * @param users
 * @returns list of users with fixed nextUserTurnId property
 */
GameLogic.prototype.setTurnsOrder = function (users) {

    if (users.length > 0) {
        //set array of user ids
        var idsArray = Utils.generateArrayOfUsersIds(users);

        //set next user turn for all except from the last one
        for (var i = 1; i < idsArray.length; i++) {
            Utils.getUserById(users, idsArray[i - 1]).nextUserTurnId = idsArray[i];
        }
        //set next user turn for the last one
        Utils.getUserById(users, idsArray[idsArray.length - 1]).nextUserTurnId = idsArray[0];
    }

    return users;
};

/**
 * get playing users
 * @param users
 * @returns {Array}
 */
GameLogic.prototype.getPlayingUsers = function (users) {

    var playingUsers = [];

    users.forEach(function (user) {
        if (user.isLoggedIn) {
            playingUsers.push(user);
        }
    });

    return playingUsers;
};


module.exports = GameLogic;