var Sequelize = require('sequelize');
var modules = require('./modules');
var Util = require('util');

function DBManager() {

    var ENVIRONMENTS = {
        LOCAL: {
            host: 'localhost',
            schema: 'dice_db',
            username: 'root',
            password: 'q1w2e3'
        },
        PRODUCTION: {
            host: 'localhost',
            schema: 'dicelies_db',
            username: 'root',
            password: 'q1w2e3r4'
        }
    };

    //TODO SELECTED ENVIRONMENT!!!!!
    var selectedEnvironment = ENVIRONMENTS.PRODUCTION;

    //define DB connection
    var connection = new Sequelize(selectedEnvironment.schema, selectedEnvironment.username, selectedEnvironment.password, {
        logging: false,
        host: selectedEnvironment.host,
        dialect: 'mysql',
        pool: {
            max: 5,
            min: 0,
            idle: 10000
        }
    });

    //define room
    var Room = connection.define('room', modules.room);
    //define user
    var User = connection.define('user', modules.user);
    //define cube
    var Cube = connection.define('cube', modules.cube, {timestamps: false});

    //define relationships
    Cube.belongsTo(User, {as: "user"});
    Cube.belongsTo(Room, {as: "room"});

    Room.belongsTo(User, {as: "currentUserTurn", constraints: false});
    Room.belongsTo(User, {as: "lastUserTurn", constraints: false});
    Room.belongsTo(User, {as: "owner", constraints: false});
    Room.hasMany(User);
    Room.hasMany(Cube);

    User.belongsTo(Room, {as: "room"});
    User.belongsTo(User, {as: "nextUserTurn"});
    User.hasMany(Cube);

    //sync DB
    connection.sync().then(function () {
        Util.log("set db successfully");
    });

    this.Room = Room;
    this.User = User;
    this.Cube = Cube;
}

DBManager.prototype.clearRoomCubes = function (roomId) {

    var self = this;

    return self.Cube.destroy({
        where: {
            roomId: roomId
        }
    });
};

DBManager.prototype.clearUserCubes = function (userId) {

    var self = this;

    return self.Cube.destroy({
        where: {
            userId: userId
        }
    });
};

DBManager.prototype.createUser = function (username, password) {

    var self = this;

    return self.User.create({
        name: username,
        password: password
    });
};


DBManager.prototype.getRoomById = function (roomId, withUsers) {

    var self = this;

    var request = {
        where: {
            id: roomId
        }
    };

    if (withUsers) {
        request.include = [
            self.User
        ];
    }

    return self.Room.find(request).then(function (room) {
        return setResult(room);
    });
};

DBManager.prototype.getRoomByName = function (roomName) {

    var self = this;

    var request = {
        where: {
            name: roomName
        }
    };

    return self.Room.find(request).then(function (room) {
        return setResult(room);
    });
};


DBManager.prototype.createRoom = function (roomName, initialCubeNumber, password, ownerId) {

    var self = this;

    return self.Room.create({
        name: roomName,
        initialCubeNumber: initialCubeNumber,
        ownerId: ownerId,
        password: password
    }).then(function (room) {
        return setResult(room);
    });
};

DBManager.prototype.deleteRoom = function (roomId) {
    var self = this;

    return self.Room.destroy({
        where: {
            id: roomId
        }
    });
};

DBManager.prototype.getUserByName = function (username) {

    var self = this;

    return self.User.findOne({
        where: {
            name: username
        }
    }).then(function (user) {
        return setResult(user);
    });
};

DBManager.prototype.getUserById = function (userId) {

    var self = this;

    return self.User.findById(userId).then(function (user) {
        return setResult(user);
    });
};

DBManager.prototype.getUserBySocketId = function (socketId) {

    var self = this;

    return self.User.find({
        where: {
            socketId: socketId
        }
    }).then(function (user) {
        return setResult(user);
    });
};

DBManager.prototype.getUsersByRoomId = function (roomId, userId) {

    var self = this;

    var cubesWhere = {
        roomId: roomId
    };

    //restrict by userId
    if (userId) {
        cubesWhere.userId = userId;
    }

    return self.User.findAll({
        where: {
            roomId: roomId
        },
        include: [{
            model: self.Cube,
            where: cubesWhere,
            required: false
        }]
    }).then(function (users) {
        return setResult(users);
    });
};

DBManager.prototype.getRooms = function () {

    var self = this;

    return self.Room.findAll({
        include: [
	  {
	      model: self.User,
	      attributes: ['id']
	  }
        ]
    }).then(function (rooms) {
        return setResult(rooms);
    });
};

DBManager.prototype.saveRoom = function (room) {

    var self = this;

    return self.Room.update({
        numOfCubes: room.numOfCubes,
        lastGambleCube: room.lastGambleCube,
        lastGambleTimes: room.lastGambleTimes,
        lastUserTurnId: room.lastUserTurnId,
        currentUserTurnId: room.currentUserTurnId,
        nextUserTurnId: room.nextUserTurnId
    }, {
        where: {
            id: room.id
        }
    });
};

DBManager.prototype.saveUser = function (user) {

    var self = this;

    return self.User.update({
        currentNumOfCubes: user.currentNumOfCubes,
        gambleCube: user.gambleCube,
        gambleTimes: user.gambleTimes,
        roomId: user.roomId,
        socketId: user.socketId,
        nextUserTurnId: user.nextUserTurnId,
        isLoggedIn: user.isLoggedIn
    }, {
        where: {
            id: user.id
        }
    });
};

DBManager.prototype.saveUsers = function (users) {

    var self = this;

    var usersPromises = [];

    users.forEach(function (user) {
        usersPromises.push(self.saveUser(user));
    });

    return Promise.all(usersPromises);
};

/**
 * convert DB result to dataValues result
 * @param result
 * @returns {*}
 */
function setResult(result) {
    var finalResult;
    if (result instanceof Array) {
        finalResult = getDataValuesFromArray(result);
    } else if (result == null) {
        return {};
    } else {
        finalResult = result.toJSON();
    }
    return finalResult;
}

/**
 * convert array to only dataValues
 * @param array
 * @returns {Array}
 */
function getDataValuesFromArray(array) {
    var newArray = [];
    array.forEach(function (item) {
        newArray.push(item.toJSON());
    });
    return newArray;
}

/**
 * send push for room's sockets
 * @param roomSockets
 * @param type
 * @param roomId
 * @param data
 */
DBManager.prototype.pushForRoomUsers = function (roomSockets, type, roomId, data) {

    var self = this;

    if (roomId) { //send to room's users
        roomSockets.forEach(function (socket) {
            if (socket.roomId == roomId) {
                socket.emit(type, data);
            }
        });
    } else {//send to all the users
        roomSockets.forEach(function (socket) {
            socket.emit(type, data);
        });
    }
};

module.exports = new DBManager();