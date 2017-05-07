////////////////////server stuff////////////////////
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);

server.listen(process.env.PORT || 3000);
app.use(express.static(__dirname + '/node_modules'));
console.log("Server running...");
////////////////////end of server stuff////////////////////

//init DB
var DBManager = require('./dal/DBManager');
DBManager.getDBManager();

//utils
var Utils = require('./utils/utils');

//Logic libraries
var UserLogic = require('./logic/UserLogic');
var RoomLogic = require('./logic/RoomLogic');
var GameLogic = require('./logic/GameLogic');

var users = [];
var connections = [];

//web sockets manager
io.on('connection', function (socket) {
    connections.push(socket);
    setLog("Connected -> " + connections.length + " sockets connected");

    //on client disconnected
    socket.on('disconnect', function () {

        connections.splice(connections.indexOf(socket), 1);
        setLog("Disconnected -> " + connections.length + " sockets connected");
    });

    //client logged out from room
    socket.on('exitRoom', function (data, callback) {

        setLog(data.userId + " left his room");

        var userLogic = new UserLogic();

        userLogic.exitRoom(data.userId, connections, callback);
    });

    //client login
    socket.on('login', function (data, callback) {

        setLog(data.name + " try to login");

        var userLogic = new UserLogic();

        userLogic.login(data.name, data.password, callback);
    });

    //client login
    socket.on('register', function (data, callback) {

        setLog(data.username + " try to register");

        var userLogic = new UserLogic();

        userLogic.register(data.username, data.password, callback);
    });

    //restart room
    socket.on('restartGame', function (data, callback) {

        setLog(data.roomId + " restarted by userId = " + data.userId);

        var gameLogic = new GameLogic();

        gameLogic.restartGame(data.userId, data.roomId, connections, null, null, callback);
    });

    //get rooms
    socket.on('getRooms', function (data, callback) {

        setLog("user asked for rooms");

        var roomLogic = new RoomLogic();

        roomLogic.getRooms(callback);
    });

    //create room
    socket.on('createRoom', function (data, callback) {

        setLog("room created with name " + data.roomName + " by userId = " + data.userId);

        var roomLogic = new RoomLogic();

        roomLogic.createRoom(data.roomName, data.initialCubeNumber, data.password, data.userId, function (type, data) {
            io.emit(type, data);
        }, callback);
    });

    //enter to room
    socket.on('enterRoom', function (data, callback) {

        setLog("userId = " + data.userId + " entered to roomId = " + data.roomId);

        var roomLogic = new RoomLogic();

        roomLogic.enterRoom(data.roomId, data.userId, connections, callback);
    });

    //get game
    socket.on('getGame', function (data, callback) {

        var gameLogic = new GameLogic();

        gameLogic.getGame(data.roomId, data.userId, callback);
    });

    //set gamble
    socket.on('setGamble', function (data, callback) {

        setLog("setGamble -> userId = " + data.userId + ", roomId " + data.roomId + " gambleTimes = " + gambleTimes + ", gambleCube = " + data.gambleCube + ", isLying = " + data.isLying);

        var gameLogic = new GameLogic();

        gameLogic.setGamble(data.userId, data.roomId, data.gambleTimes, data.gambleCube, data.isLying, callback, connections);
    });

    socket.on('sendMessage', function (data, callback) {

        setLog("sendMessage -> userId = " + data.userId + " content = " + data.content);

        var gameLogic = new GameLogic();

        gameLogic.sendMessage(data.userId, data.content, connections, callback);
    });

    // socket.on('setSocketId', function (data, callback) {
    //
    //     var userLogic = new UserLogic();
    //
    //     userLogic.setSocketId(data.userId, socket.id, callback);
    // });

    socket.on('setSocketDetails', function (data, callback) {
        socket.roomId = data.roomId;
        socket.userId = data.userId;

        callback && callback({
            response: Utils.serverResponse.SUCCESS,
            result: "no data"
        });
    });
});

//every five minutes - clean inactive players and rooms
setInterval(function () {

    var userLogic = new UserLogic();

    userLogic.cleanInActiveUsers(connections);

    var roomLogic = new RoomLogic();

    roomLogic.cleanInActiveRooms(connections);
}, 1000 * 60 * 5);


// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

function setLog(log) {
    console.log(new Date().toDateString() + " " + new Date().toTimeString().substring(0, 8) + ": " + log);
}