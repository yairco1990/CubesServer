var RoomLogic = require('../logic/RoomLogic');
var Util = require('util');

module.exports = function (socket, connections) {

    var roomLogic = new RoomLogic();

    //get rooms
    socket.on('getRooms', function (data, callback) {
        roomLogic.getRooms(socket, callback);
    });

    //create room
    socket.on('createRoom', function (data, callback) {
        roomLogic.createRoom(socket, data.roomName, data.initialCubeNumber, data.password, data.userId, callback);
    });

    //enter to room
    socket.on('enterRoom', function (data, callback) {
        roomLogic.enterRoom(socket, data.roomId, data.userId, connections, callback);
    });
};