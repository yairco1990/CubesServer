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
        self.DBManager.saveUser(user).then(function (rooms) {
            callback({
                response: Utils.serverResponse.SUCCESS,
                result: user
            });

            //send push for all the room's users
            self.DBManager.pushForRoomUsers(sockets, Utils.pushCase.UPDATE_GAME, roomId);
        });
        // });
    });
};

module.exports = RoomLogic;