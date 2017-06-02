var UserLogic = require('../logic/UserLogic');
var Util = require('util');

module.exports = function (socket, connections) {

    var userLogic = new UserLogic();

    //client logged out from room
    socket.on('exitRoom', function (data, callback) {

        Util.log(data.userId + " left his room");

        userLogic.exitRoom(data.userId, connections, callback);
    });

    //client login
    socket.on('login', function (data, callback) {

        Util.log(data.name + " try to login");

        userLogic.login(data.name, data.password, callback);
    });

    //client login
    socket.on('register', function (data, callback) {

        Util.log(data.username + " try to register");

        userLogic.register(data.username, data.password, callback);
    });
};