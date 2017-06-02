module.exports = function cleanServer(connections) {

    //Logic libraries
    var UserLogic = require('./logic/UserLogic');
    var RoomLogic = require('./logic/RoomLogic');

    //every five minutes - clean inactive players and rooms
    setInterval(function () {

        var userLogic = new UserLogic();

        userLogic.cleanInActiveUsers(connections);

        var roomLogic = new RoomLogic();

        roomLogic.cleanInActiveRooms(connections);

    }, 1000 * 60 * 5);
};