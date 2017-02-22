////////////////////server stuff////////////////////
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);

server.listen(process.env.PORT || 3000);
app.use(express.static(__dirname + '/node_modules'));
console.log("Server running...");
////////////////////end of server stuff////////////////////

//Dal init
var DBManager = require('./DBManager');
DBManager.getDBManager();

//Logic libraries
var UserLogic = require('./UserLogic');
var RoomLogic = require('./RoomLogic');
var GameLogic = require('./GameLogic');

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

    //on client login
    socket.on('login', function (data, callback) {

        var userLogic = new UserLogic();

        userLogic.login(data.name, data.password, callback);
    });

    //get rooms
    socket.on('getRooms', function (data, callback) {

        var roomLogic = new RoomLogic();

        roomLogic.getRooms(callback);
    });

    //get game
    socket.on('getGame', function (data, callback) {

        var gameLogic = new GameLogic();

        gameLogic.getGame(data.roomId, callback);
    });

    //set gamble
    socket.on('setGamble', function (data, callback) {

        var gameLogic = new GameLogic();

        gameLogic.setGamble(data.userId, data.roomId, data.gambleTimes, data.gambleCube, data.isLying, callback, function(type){
            io.emit(type, "this is a test");
        });
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