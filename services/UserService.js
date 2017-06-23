var UserLogic = require('../logic/UserLogic');
var Util = require('util');

module.exports = function (socket, connections) {

    var userLogic = new UserLogic();

    //client login
    socket.on('login', function (data, callback) {
        userLogic.login(data.name, data.password, callback);
    });

    //client login
    socket.on('register', function (data, callback) {
        userLogic.register(data.username, data.password, callback);
    });

    //get score results
    socket.on('getScores', function (data, callback) {
        userLogic.getScores(socket, callback);
    });

    //get user
    socket.on('getUser', function (data, callback) {
        userLogic.getUser(data.userId, callback);
    });
};