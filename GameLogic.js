//utils library
var Utils = require('./utils');

var DBManager = require('./DBManager');

function GameLogic() {
    this.DBManager = DBManager.getDBManager();
}

var pushCase = {
    SESSION_ENDED: "sessionEnded",
    PLAYER_GAMBLED: "playerGambled",
    GAME_OVER: "gameOver"
};

/**
 * login function
 * @param roomId
 * @param callback
 */
GameLogic.prototype.getGame = function (roomId, callback) {

    var self = this;

    self.DBManager.getRoomById(roomId).then(function (room) {

        self.DBManager.getUsersByRoomId(roomId).then(function (users) {

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


GameLogic.prototype.setGamble = function (userId, roomId, gambleTimes, gambleCube, isLying, callback, updateTheUsers) {

    var self = this;

    var result;

    //get current user
    self.DBManager.getUserById(userId).then(function (user) {
        //get room
        self.DBManager.getRoomById(roomId).then(function (room) {
            //get users in room
            self.DBManager.getUsersByRoomId(roomId).then(function (users) {

                var eventType = null;

                //if the current user set lie - check last gamble
                if (isLying) {
                    //get the last gamble
                    var lastGambleTimes = room.lastGambleTimes;
                    var lastGambleCube = room.lastGambleCube;

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

                    var wrongGambler = null;

                    //check if the gamble correct or not
                    if (lastGambleTimes > correctCubesCounter) {
                        //if wrong gamble - minus cube to last user
                        wrongGambler = room.lastUserTurnId;

                        result = "WRONG_GAMBLE";
                    } else {
                        //if good gamble - minus cube to current user
                        wrongGambler = room.currentUserTurnId;

                        result = "CORRECT_GAMBLE";
                    }

                    //set room details
                    room.numOfCubes = allCubesCounter;
                    room.lastGambleCube = null;
                    room.lastGambleTimes = null;
                    room.lastUserTurnId = null;
                    room.currentUserTurnId = wrongGambler;

                    //save the room
                    self.DBManager.saveRoom(room).then(function () {

                        //get the loser
                        self.DBManager.getUserById(wrongGambler).then(function (gambler) {

                            //minus cube for the loser
                            gambler.currentNumOfCubes--;

                            //save the gambler
                            self.DBManager.saveUser(gambler).then(function () {

                                //get the updated room
                                self.DBManager.getUsersByRoomId(roomId).then(function (updatedUsers) {

                                    //clear room cubes
                                    self.DBManager.clearRoomCubes(roomId).then(function () {
                                        var userCounter = 0;
                                        //set gambles to null
                                        updatedUsers.forEach(function (updatedUser) {
                                            updatedUser.gambleCube = null;
                                            updatedUser.gambleTimes = null;

                                            //save user
                                            self.DBManager.saveUser(updatedUser).then(function () {

                                                //set user cubes
                                                Promise.all(self.setCubesForUser(updatedUser)).then(function () {
                                                    console.log("set cubes for user - ", updatedUser.name);
                                                    userCounter++;
                                                    if (userCounter == updatedUsers.length) {

                                                        //get the winner
                                                        var winner = self.isGameOver(updatedUsers);

                                                        if (winner != null) {
                                                            updateTheUsers(pushCase.GAME_OVER);

                                                            //init the room
                                                            self.initRoom(winner, room, updatedUsers);
                                                        } else {
                                                            updateTheUsers(pushCase.SESSION_ENDED);
                                                        }
                                                        callback({
                                                            response: Utils.serverResponse.SUCCESS,
                                                            result: result
                                                        });
                                                    }
                                                });
                                            });
                                        })
                                    });
                                });
                            })
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
                            updateTheUsers(pushCase.PLAYER_GAMBLED);
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
                user.currentNumOfCubes = 5;

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


module.exports = GameLogic;