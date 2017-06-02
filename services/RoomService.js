var RoomLogic = require('../logic/RoomLogic');
var Util = require('util');

module.exports = function (socket, connections) {

    var roomLogic = new RoomLogic();

    //get rooms
    socket.on('getRooms', function (data, callback) {

        Util.log("user asked for rooms");

        roomLogic.getRooms(callback);
    });

    //create room
    socket.on('createRoom', function (data, callback) {

        Util.log("room created with name " + data.roomName + " by userId = " + data.userId);

        roomLogic.createRoom(data.roomName, data.initialCubeNumber, data.password, data.userId, function (type, data) {
            io.emit(type, data);
        }, callback);
    });

    //enter to room
    socket.on('enterRoom', function (data, callback) {

        Util.log("userId = " + data.userId + " entered to roomId = " + data.roomId);

        roomLogic.enterRoom(data.roomId, data.userId, connections, callback);
    });
};