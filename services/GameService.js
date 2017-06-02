var GameLogic = require('../logic/GameLogic');
var Util = require('util');

module.exports = function (socket, connections) {

    var gameLogic = new GameLogic();

    //restart room
    socket.on('restartGame', function (data, callback) {

        Util.log(data.roomId + " restarted by userId = " + data.userId);

        gameLogic.restartGame(data.userId, data.roomId, connections, null, null, callback);
    });

    //get game
    socket.on('getGame', function (data, callback) {

        gameLogic.getGame(data.roomId, data.userId, callback);
    });

    //set gamble
    socket.on('setGamble', function (data, callback) {

        Util.log("setGamble -> userId = " + data.userId + ", roomId " + data.roomId + " gambleTimes = " + data.gambleTimes + ", gambleCube = " + data.gambleCube + ", isLying = " + data.isLying);

        gameLogic.setGamble(data.userId, data.roomId, data.gambleTimes, data.gambleCube, data.isLying, callback, connections);
    });

    //send message
    socket.on('sendMessage', function (data, callback) {

        Util.log("sendMessage -> userId = " + data.userId + " content = " + data.content);

        gameLogic.sendMessage(data.userId, data.content, connections, callback);
    });
};