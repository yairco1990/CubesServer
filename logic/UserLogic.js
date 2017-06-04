//utils library
var Utils = require('../utils/utils');
var bcrypt = require('bcrypt-nodejs');
var Util = require('util');

function UserLogic() {
    this.DBManager = require('../dal/DBManager');
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
    });
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
	  }).catch(function (err) {
	      callback({
		response: Utils.serverResponse.ERROR,
		result: "ALREADY_EXIST"
	      });
	      Util.log(err);
	  });
        } else {
	  callback({
	      response: Utils.serverResponse.ERROR,
	      result: "ALREADY_EXIST"
	  });
        }
    });
};

/**
 * on user disconnected from room
 */
UserLogic.prototype.exitRoom = function (userId, sockets, callback) {
    var self = this;

    self.DBManager.getUserById(userId).then(function (user) {

        //save current room id
        var currentRoomId = user.roomId;

        self.DBManager.getRoomById(currentRoomId, true).then(function (room) {

	  var data = {users: room.users, isUserLeft: true};

	  //clear user cubes
	  self.DBManager.clearUserCubes(user.id).then(function () {

	      //check if user playing
	      if (user.isLoggedIn) {
		room.currentUserTurnId = user.nextUserTurnId;

		self.DBManager.saveRoom(room).then(function () {
		    //set room to null
		    user.roomId = null;
		    //set user logout details
		    user.nextUserTurnId = null;
		    user.currentNumOfCubes = null;
		    user.gambleCube = null;
		    user.gambleTimes = null;

		    //save user
		    self.DBManager.saveUser(user).then(function () {

		        //get room's users
		        self.DBManager.getUsersByRoomId(currentRoomId).then(function (users) {

			  //create gameLogic instance
			  var GameLogic = require('./GameLogic');
			  var gameLogic = new GameLogic();

			  //save users turns
			  self.DBManager.saveUsers(gameLogic.setTurnsOrder(users)).then(function () {

			      gameLogic.restartRound(room.id, sockets, users.length, data);

			      callback({
				response: Utils.serverResponse.SUCCESS,
				result: "no data"
			      });
			  });
		        });
		    });
		});
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
	  });
        });
    });
};

/**
 * set socket id for user
 * @param userId
 * @param socketId
 * @param callback
 */
UserLogic.prototype.setSocketId = function (userId, socketId, callback) {

    var self = this;

    self.DBManager.getUserById(userId).then(function (user) {

        user.socketId = socketId;
        self.DBManager.saveUser(user).then(function () {

	  console.log("successfully set socketId for user = " + user.name);
	  callback({
	      response: Utils.serverResponse.SUCCESS,
	      result: "no data"
	  });
        });
    });
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

		// var inActiveTimeToDelete = 1000 * 60 * 5;
		var inActiveTimeToDelete = 1000 * 60 * 10;

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