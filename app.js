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

//Logic libraries
var UserLogic = require('./logic/UserLogic');
var RoomLogic = require('./logic/RoomLogic');
var GameLogic = require('./logic/GameLogic');

var users = [];
var connections = [];

//web sockets manager
io.on('connection', function (socket) {
    connections.push(socket);
    console.log("Connected: %s sockets connected", connections.length);

    //on client disconnected
    socket.on('disconnect', function () {

        connections.splice(connections.indexOf(socket), 1);
        console.log("Disconnected: %s sockets connected", connections.length);
    });

    //client logged out from room
    socket.on('logout', function (data, callback) {

        var userLogic = new UserLogic();

        userLogic.logout(socket.id, connections, callback).then(function () {

        });
    });

    //client login
    socket.on('login', function (data, callback) {

        var userLogic = new UserLogic();

        userLogic.login(data.name, data.password, callback);
    });

    //client login
    socket.on('register', function (data, callback) {

        var userLogic = new UserLogic();

        userLogic.register(data.username, data.password, callback);
    });

    //restart room
    socket.on('restartGame', function (data, callback) {

        var gameLogic = new GameLogic();

        gameLogic.restartGame(data.userId, data.roomId, connections, null, null, callback);
    });

    //get rooms
    socket.on('getRooms', function (data, callback) {

        var roomLogic = new RoomLogic();

        roomLogic.getRooms(callback);
    });

    //create room
    socket.on('createRoom', function (data, callback) {

        var roomLogic = new RoomLogic();

        roomLogic.createRoom(data.roomName, data.initialCubeNumber, data.userId, callback);
    });

    //enter to room
    socket.on('enterRoom', function (data, callback) {

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

        var gameLogic = new GameLogic();

        gameLogic.setGamble(data.userId, data.roomId, data.gambleTimes, data.gambleCube, data.isLying, callback, connections);
    });

    socket.on('sendMessage', function (data, callback) {

        var gameLogic = new GameLogic();

        gameLogic.sendMessage(data.userId, data.content, connections, callback);
    });

    socket.on('setSocketId', function (data, callback) {

        var userLogic = new UserLogic();

        userLogic.setSocketId(data.userId, socket.id, callback);
    });
});

/**
 * restart room game by http request
 */
app.get('/restartRoom', function (req, res) {

    var gameLogic = new GameLogic();

    gameLogic.restartGame(req.query.userId, req.query.roomId, connections, null, null, function (data) {
        res.send(data.response);
    });
});


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