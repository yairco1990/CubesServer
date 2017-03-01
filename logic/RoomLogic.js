//utils library
var Utils = require('../utils/utils');

var DBManager = require('../dal/DBManager');

function RoomLogic() {
    this.DBManager = DBManager.getDBManager();
}

/**
 * get rooms function
 * @param callback
 */
RoomLogic.prototype.getRooms = function (callback) {

    this.DBManager.getRooms().then(function (rooms) {
        if (rooms != "NO_ROWS_FOUND") {
            callback({
                response: Utils.serverResponse.SUCCESS,
                result: rooms
            });
        } else {
            callback({
                response: Utils.serverResponse.ERROR,
                result: "NO_ROOMS"
            });
        }
    });
};

/**
 * create room
 * @param callback
 */
RoomLogic.prototype.createRoom = function (roomName, initialCubeNumber, ownerId, callback) {

    var self = this;

    self.DBManager.getRoomByName(roomName).then(function (room) {
        //check if room exist
        if (room.id == null) {
            self.DBManager.createRoom(roomName, initialCubeNumber, ownerId).then(function (room) {
                callback({
                    response: Utils.serverResponse.SUCCESS,
                    result: room
                });
            });
        } else {
            callback({
                response: Utils.serverResponse.ERROR,
                result: "ALREADY_EXIST"
            });
        }
    });
};


/**
 * enter to room
 * @param roomId
 * @param userId
 * @param callback
 */
RoomLogic.prototype.enterRoom = function (roomId, userId, sockets, callback) {
    var self = this;

    self.DBManager.getUserById(userId).then(function (user) {

        //clear cuber
        // self.DBManager.clearUserCubes(userId).then(function () {
        //set room id
        user.roomId = roomId;

        //by default not play when entering
        user.isLoggedIn = false;

        //save the user
        self.DBManager.saveUser(user).then(function () {

            //get the room
            self.DBManager.getRoomById(roomId, true).then(function (room) {

                //create gameLogic instance
                var GameLogic = require('./GameLogic');
                var gameLogic = new GameLogic();

                //get users in the room
                var usersInRoom = room.users;

                //if it was only one in the room and its 2 - restart the game
                if (usersInRoom.length == 2) {
                    gameLogic.restartGame(usersInRoom[0].id, roomId, sockets, Utils.pushCase.GAME_RESTARTED, null, callback);
                } else { //game already played before
                    callback({
                        response: Utils.serverResponse.SUCCESS,
                        result: user
                    });

                    //send push for all the room's users
                    self.DBManager.pushForRoomUsers(sockets, Utils.pushCase.UPDATE_GAME, roomId);
                }
            });
        });
    });
};

module.exports = RoomLogic;