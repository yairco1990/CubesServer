////////////////////server stuff////////////////////
var express = require('express');
var Util = require('util');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var ServerResponse = require('./utils/ServerResponse');
server.listen(3000);
app.use(express.static(__dirname + '/node_modules'));
Util.log("Server running...");
////////////////////end of server stuff////////////////////

//init DB
var DBManager = require('./dal/DBManager');

//utils
var Utils = require('./utils/utils');

var connections = [];

//Logic libraries
var UserServices = require('./services/UserService');
var RoomServices = require('./services/RoomService');
var GameServices = require('./services/GameService');

//web sockets manager
io.on('connection', function (socket) {

    connections.push(socket);
    Util.log("Connected -> " + connections.length + " sockets connected");

    //on client disconnected
    socket.on('disconnect', function () {

        connections.splice(connections.indexOf(socket), 1);
        Util.log("Disconnected -> " + connections.length + " sockets connected");
    });

    socket.on('setSocketDetails', function (data, callback) {

        socket.roomId = data.roomId;
        socket.userId = data.userId;

        callback && callback(new ServerResponse(Utils.serverResponse.SUCCESS, "no data"));
    });

    //create services objects for every sockets that connected to the server
    UserServices(socket, connections);
    RoomServices(socket, connections);
    GameServices(socket, connections);
});

//launch cleaner
require('./cleaner')(connections);

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

// Add headers
app.use(function (req, res, next) {
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8888');
    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);
    // Pass to next layer of middleware
    next();
});