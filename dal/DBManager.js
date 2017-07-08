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
    var sequelize = new Sequelize(selectedEnvironment.schema, selectedEnvironment.username, selectedEnvironment.password, {
        logging: false,
        host: selectedEnvironment.host,
        dialect: 'mysql',
        pool: {
	  max: 1,
	  min: 0,
	  idle: 500
        }
    });

    //define room
    var Room = sequelize.define('room', modules.room);
    //define user
    var User = sequelize.define('user', modules.user);
    //define cube
    var Cube = sequelize.define('cube', modules.cube, {timestamps: false});

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
    sequelize.sync().then(function () {
        Util.log("set db successfully");
    });

    this.sequelize = sequelize;

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

    return self.Room.find(request);
};

DBManager.prototype.getRoomByName = function (roomName) {

    var self = this;

    var request = {
        where: {
	  name: roomName
        }
    };

    return self.Room.find(request);
};


DBManager.prototype.createRoom = function (roomName, initialCubeNumber, password, ownerId) {

    var self = this;

    return self.Room.create({
        name: roomName,
        initialCubeNumber: initialCubeNumber,
        ownerId: ownerId,
        password: password
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
    });
};

DBManager.prototype.getUsersByScore = function (numOfResult) {

    var self = this;

    var query = "SELECT name,wins,score,games FROM users ORDER BY score DESC LIMIT " + numOfResult;

    return self.sequelize.query(query).spread(function (results, metadata) {
        return results;
    });
};

DBManager.prototype.getUserById = function (userId) {

    var self = this;

    return self.User.findById(userId);
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
        nextUserTurnId: room.nextUserTurnId,
        firstRound: room.firstRound,
        sessionPlayers: room.sessionPlayers
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
        isLoggedIn: user.isLoggedIn,
        wins: user.wins,
        games: user.games,
        score: user.score,
        isAutoLie: user.isAutoLie
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

module.exports = new DBManager();