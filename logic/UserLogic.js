//utils library
var Utils = require('../utils/utils');
var bcrypt = require('bcrypt-nodejs');
var Util = require('util');
var MyUtils = require('../utils/utils');

function UserLogic() {
    this.DBManager = require('../dal/DBManager');
    this.SharedLogic = new (require('./SharedLogic'));
}

/**
 * login function
 * @param username
 * @param password
 * @param callback
 */
UserLogic.prototype.login = function (username, password, callback) {

    this.DBManager.getUserByName(username).then(function (user) {
        if (user.id) {
	  if (bcrypt.compareSync(password, user.password)) {
	      callback({
		response: Utils.serverResponse.SUCCESS,
		result: user
	      });
	  } else {
	      callback({
		response: Utils.serverResponse.ERROR,
		result: "WRONG_PASSWORD"
	      });
	  }
        } else {
	  callback({
	      response: Utils.serverResponse.ERROR,
	      result: "NO_SUCH_USER"
	  });
        }
    }).catch(MyUtils.getErrorFunction("failed to login", callback));
};

UserLogic.prototype.getUser = function (userId, callback) {

    this.DBManager.getUserById(userId).then(function (user) {
        if (user.id) {
	  callback({
	      response: Utils.serverResponse.SUCCESS,
	      result: user
	  });
        } else {
	  callback({
	      response: Utils.serverResponse.ERROR,
	      result: "NO_SUCH_USER"
	  });
        }
    }).catch(MyUtils.getErrorFunction("failed to get user by id", callback));
};


/**
 * register for new user
 * @param username
 * @param password
 * @param callback
 */
UserLogic.prototype.register = function (username, password, callback) {

    var self = this;

    self.DBManager.getUserByName(username).then(function (user) {
        if (user.id == null) {

	  //encrypt password
	  var hashPassword = bcrypt.hashSync(password);

	  //create user
	  self.DBManager.createUser(username, hashPassword).then(function (newUser) {
	      callback({
		response: Utils.serverResponse.SUCCESS,
		result: newUser
	      });
	  }).catch(MyUtils.getErrorFunction("failed to get user by id", callback, Utils.serverResponse.ERROR, "ALREADY_EXIST"));
        } else {
	  callback({
	      response: Utils.serverResponse.ERROR,
	      result: "ALREADY_EXIST"
	  });
        }
    }).catch(MyUtils.getErrorFunction("failed to get user by id", callback));
};


/**
 * get scores
 * @param callback
 */
UserLogic.prototype.getScores = function (callback) {

    var self = this;

    self.DBManager.getUsersByScore(10).then(function (users) {
        callback({
	  response: Utils.serverResponse.SUCCESS,
	  result: users
        });
    }).catch(MyUtils.getErrorFunction("failed to get scores", callback));
};

/**
 * on user disconnected from room
 */
UserLogic.prototype.exitRoom = function (userId, sockets, callback) {
    var self = this;

    var room, user, currentRoomId, data, users;

    //create gameLogic instance
    var GameLogic = require('./GameLogic');
    var gameLogic = new GameLogic();

    self.DBManager.getUserById(userId).then(function (user) {
        return user;
    }).then(function (_user) {
        user = _user;

        //save current room id
        currentRoomId = user.roomId;
        //get the room
        return self.DBManager.getRoomById(currentRoomId, true);
    }).then(function (_room) {
        room = _room;

        //save data
        data = {users: room.users, isUserLeft: true};
        //clear the user dice
        return self.DBManager.clearUserCubes(user.id);
    }).then(function () {

        //check if user playing
        if (user.isLoggedIn) {
	  room.currentUserTurnId = user.nextUserTurnId;

	  return self.DBManager.saveRoom(room);
        } else {
	  //set room to null
	  user.roomId = null;
	  //set user logout details
	  user.nextUserTurnId = null;
	  user.currentNumOfCubes = null;
	  user.gambleCube = null;
	  user.gambleTimes = null;

	  //save user
	  self.DBManager.saveUser(user).then(function () {

	      //update the other users
	      self.DBManager.pushForRoomUsers(sockets, Utils.pushCase.UPDATE_GAME, room.id);

	      callback({
		response: Utils.serverResponse.SUCCESS,
		result: "no data"
	      });
	  });
        }
    }).then(function () {

        //set room to null
        user.roomId = null;
        //set user logout details
        user.nextUserTurnId = null;
        user.currentNumOfCubes = null;
        user.gambleCube = null;
        user.gambleTimes = null;
        user.isLoggedIn = false;

        //set left player score
        self.SharedLogic.setLeftPlayerScore(room, user);

        //save user
        return self.DBManager.saveUser(user)
    }).then(function () {

        //get room's users
        return self.DBManager.getUsersByRoomId(currentRoomId);

    }).then(function (_users) {
        users = _users;

        //save users turns
        return self.DBManager.saveUsers(gameLogic.setTurnsOrder(users))

    }).then(function () {

        gameLogic.restartRound(room.id, sockets, users.length, data);

        callback({
	  response: Utils.serverResponse.SUCCESS,
	  result: "no data"
        });
    }).catch(MyUtils.getErrorFunction("Failed to exit from the room", callback));

};

/**
 * clean inactive users
 * @param sockets
 */
UserLogic.prototype.cleanInActiveUsers = function (sockets) {

    var self = this;

    self.DBManager.getRooms().then(function (rooms) {

        //iterate the rooms
        rooms.forEach(function (room) {

	  //iterate the users
	  self.DBManager.getUsersByRoomId(room.id).then(function (users) {
	      users.forEach(function (user) {

		var inActiveTimeToDelete = 1000 * 60 * 5;
		// var inActiveTimeToDelete = 1000 * 60 * 10;

		//if the user is inactive for X minutes
		if ((user.isLoggedIn || user.roomId) && (user.updatedAt.valueOf() + inActiveTimeToDelete < new Date().valueOf())) {

		    Util.log("clean userId = " + user.id + " for inactive");

		    //clean user's cubes
		    self.DBManager.clearUserCubes(user.id).then(function () {

		        user.roomId = null;
		        user.isLoggedIn = false;
		        user.currentNumOfCubes = null;
		        user.gambleTimes = null;
		        user.gambleCube = null;
		        user.nextUserTurnId = null;
		        user.socketId = null;

		        self.DBManager.saveUser(user).then(function () {
			  self.DBManager.pushForRoomUsers(sockets, Utils.pushCase.UPDATE_GAME, room.id, "user left");
		        });
		    });
		}
	      });
	  });
        });
    });
};

module.exports = UserLogic;