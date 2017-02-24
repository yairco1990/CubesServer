//utils library
var Utils = require('../utils/utils');

var DBManager = require('../dal/DBManager');

function UserLogic() {
    this.DBManager = DBManager.getDBManager();
}

/**
 * login function
 * @param username
 * @param password
 * @param callback
 */
UserLogic.prototype.login = function (username, password, callback) {

    this.DBManager.getUserByName(username).then(function (user) {
        if (user != "NO_ROWS_FOUND") {
            if (user.password == password) {
                callback({
                    response: Utils.serverResponse.SUCCESS,
                    result: user
                });
            } else {
                callback({
                    response: Utils.serverResponse.ERROR,
                    result: "WRONG_PASSWORD"
                });
            }
        } else {
            callback({
                response: Utils.serverResponse.ERROR,
                result: "NO_SUCH_USER"
            });
        }
    });
};

/**
 * on user disconnected
 * @param socketId
 * @param callback
 */
UserLogic.prototype.logout = function (socketId, sockets) {
    var self = this;

    return self.DBManager.getUserBySocketId(socketId).then(function (user) {

        //save current room id
        var currentRoomId = user.roomId;

        self.DBManager.getRoomById(currentRoomId).then(function(room){

            //clear user cubes
            self.DBManager.clearUserCubes(user.id).then(function () {

                room.currentUserTurnId = user.nextUserTurnId;

                //TODO fix turns
                self.DBManager.getUsersByRoomId(currentRoomId).then(function(users){

                    self.DBManager.saveRoom(room).then(function(){
                        //set room to null
                        user.roomId = null;

                        //set user logout details
                        user.nextUserTurnId = null;
                        user.currentNumOfCubes = null;
                        user.gambleCube = null;
                        user.gambleTimes = null;

                        //save user
                        self.DBManager.saveUser(user).then(function () {
                            //TODO change the push type!!!
                            self.DBManager.pushForRoomUsers(sockets, Utils.pushCase.PLAYER_GAMBLED, currentRoomId);
                        });
                    });
                });
            });
        });
    });
};

/**
 * set socket id for user
 * @param userId
 * @param socketId
 * @param callback
 */
UserLogic.prototype.setSocketId = function (userId, socketId, callback) {

    var self = this;

    self.DBManager.getUserById(userId).then(function (user) {

        user.socketId = socketId;
        self.DBManager.saveUser(user).then(function () {

            console.log("successfully set socketId for user = " + user.name);
            callback({
                response: Utils.serverResponse.SUCCESS,
                result: "no data"
            });
        });
    });
};

module.exports = UserLogic;