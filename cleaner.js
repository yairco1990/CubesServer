
module.exports = function cleanServer(connections) {

    var Util = require('util');

    //Logic libraries
    var UserLogic = require('./logic/UserLogic');
    var RoomLogic = require('./logic/RoomLogic');

    //every five minutes - clean inactive players and rooms
    setInterval(function () {

        Util.log("start cleaning. connection = " + connections.length);

        var userLogic = new UserLogic();

        userLogic.cleanInActiveUsers(connections);

        var roomLogic = new RoomLogic();

        roomLogic.cleanInActiveRooms(connections);

    }, 1000 * 60 * 5);
};