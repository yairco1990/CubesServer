/**
 * Created by Yair on 2/5/2017.
 */
var Sequelize = require('sequelize');

var dbManager = null;
DBManager.getDBManager = function () {
    if (dbManager == null) {
        dbManager = new DBManager();
    }
    return dbManager;
};

function DBManager() {

    var ENVIRONMENTS = {
        LOCAL: {
            host: 'localhost',
            schema: 'dice_db',
            username: 'root',
            password: 'q1w2e3'
        },
        DEVELOPMENT: {
            host: 'eu-cdbr-west-01.cleardb.com',
            schema: 'heroku_2c330247a016a0d',
            username: 'bbaac9bf6d1131',
            password: 'e3a4e852'
        }
    };

    //TODO SELECTED ENVIRONMENT!!!!!
    var selectedEnvironment = ENVIRONMENTS.DEVELOPMENT;

    //define DB connection
    var connection = new Sequelize(selectedEnvironment.schema, selectedEnvironment.username, selectedEnvironment.password, {
        host: selectedEnvironment.host,
        dialect: 'mysql',
        pool: {
            max: 5,
            min: 0,
            idle: 10000
        }
    });

    //define room
    var Room = connection.define('room', {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            unique: true,
            autoIncrement: true
        },
        name: {
            type: Sequelize.STRING,
            allowNull: false
        },
        numOfCubes: Sequelize.INTEGER,
        lastGambleCube: Sequelize.INTEGER,
        lastGambleTimes: Sequelize.INTEGER,
        isGameOn: Sequelize.BOOLEAN,
        initialCubeNumber: Sequelize.INTEGER
    }, {
        timestamps: false
    });

    //define user
    var User = connection.define('user', {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            unique: true
        },
        name: {
            type: Sequelize.STRING,
            allowNull: false
        },
        password: Sequelize.STRING,
        isLoggedIn: Sequelize.BOOLEAN,
        gambleCube: Sequelize.INTEGER,
        gambleTimes: Sequelize.INTEGER,
        currentNumOfCubes: Sequelize.INTEGER,
        socketId: Sequelize.STRING
    }, {
        timestamps: false
    });

    //define cube
    var Cube = connection.define('cube', {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            unique: true
        },
        cubeNum: Sequelize.INTEGER
    }, {
        timestamps: false
    });

    //define relationships
    Cube.belongsTo(User, {as: "user"});
    Cube.belongsTo(Room, {as: "room"});

    Room.belongsTo(User, {as: "currentUserTurn", constraints: false});
    Room.belongsTo(User, {as: "lastUserTurn", constraints: false});
    Room.hasMany(User);
    Room.hasMany(Cube);

    User.belongsTo(Room, {as: "room"});
    User.belongsTo(User, {as: "nextUserTurn"});
    User.hasMany(Cube);

    //sync DB
    connection.sync().then(function () {
        console.log("set db successfully");
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

DBManager.prototype.getRoomById = function (roomId) {

    var self = this;

    return self.Room.find({
        where: {
            id: roomId
        }
    }).then(function (room) {
        return setResult(room);
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

DBManager.prototype.getUsersByRoomId = function (roomId) {

    var self = this;

    return self.User.findAll({
        where: {
            roomId: roomId
        },
        include: [{
            model: self.Cube,
            where: {
                roomId: roomId
            },
            required: false
        }]
    }).then(function (users) {
        return setResult(users);
    });
};

DBManager.prototype.getRooms = function () {

    var self = this;

    return self.Room.findAll().then(function (rooms) {
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
 */
DBManager.prototype.pushForRoomUsers = function (roomSockets, type, roomId) {

    var self = this;

    self.getUsersByRoomId(roomId).then(function (users) {
        users.forEach(function (user) {
            roomSockets.forEach(function (socket) {
                if (user.socketId == socket.id) {
                    socket.emit(type, "no data");
                }
            });
        });
    });
};

module.exports = DBManager;