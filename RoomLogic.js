//utils library
var Utils = require('./utils');

var DBManager = require('./DBManager');

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

module.exports = RoomLogic;