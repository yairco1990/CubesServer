//utils library
var Utils = require('../utils/utils');
var bcrypt = require('bcrypt-nodejs');
var Util = require('util');
var MyUtils = require('../utils/utils');

function UserLogic() {
    this.DBManager = require('../dal/DBManager');
    this.sharedLogic = new (require('./SharedLogic'));
}

/**
 * login function
 * @param username
 * @param password
 * @param callback
 */
UserLogic.prototype.login = function (username, password, callback) {

    Util.log(username + " is trying to login");

    this.DBManager.getUserByName(username).then(function (user) {
        if (user) {
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

    Util.log("get user with id -> " + userId);

    this.DBManager.getUserById(userId).then(function (user) {
        if (user) {
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

    Util.log(username + " try to register");

    self.DBManager.getUserByName(username).then(function (user) {
        if (user == null) {

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
UserLogic.prototype.getScores = function (socket, callback) {

    var self = this;

    Util.log(socket.user.name + " ask for scores");

    self.DBManager.getUsersByScore(10).then(function (users) {
        callback({
	  response: Utils.serverResponse.SUCCESS,
	  result: users
        });
    }).catch(MyUtils.getErrorFunction("failed to get scores", callback));
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
		// var inActiveTimeToDelete = 1000 * 60 * 100;

		//if the user is inactive for X minutes
		if (user.isLoggedIn && (user.updatedAt.valueOf() + inActiveTimeToDelete < new Date().valueOf())) {

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
			  self.sharedLogic.pushForRoomUsers(sockets, Utils.pushCase.UPDATE_GAME, room.id, "user left");
		        });
		    });
		}
	      });
	  });
        });
    });
};

module.exports = UserLogic;