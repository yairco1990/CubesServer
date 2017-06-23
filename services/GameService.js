var GameLogic = require('../logic/GameLogic');
var Util = require('util');

module.exports = function (socket, connections) {

    var gameLogic = new GameLogic();

    //restart room
    socket.on('restartGame', function (data, callback) {
        gameLogic.restartGame(data.userId, data.roomId, connections, null, null, callback);
    });

    //get game
    socket.on('getGame', function (data, callback) {
        gameLogic.getGame(data.roomId, data.userId, callback);
    });

    //set gamble
    socket.on('setGamble', function (data, callback) {
        gameLogic.setGamble(socket, data.userId, data.roomId, data.gambleTimes, data.gambleCube, data.isLying, callback, connections);
    });

    //set auto lye
    socket.on('setAutoLye', function (data, callback) {
        gameLogic.setAutoLye(socket, data.autoLye, connections, callback);
    });

    //send message
    socket.on('sendMessage', function (data, callback) {
        gameLogic.sendMessage(socket, data.userId, data.content, connections, callback);
    });
};