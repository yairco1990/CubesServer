//utils library
var MyUtils = require('../utils/utils');
var Util = require('util');
var ServerResponse = require('../utils/ServerResponse');

function RoomLogic() {
    this.DBManager = require('../dal/DBManager');
    this.sharedLogic = new (require('./SharedLogic'));
}

/**
 * get rooms function
 * @param callback
 * @param socket
 */
RoomLogic.prototype.getRooms = function (socket, callback) {

    Util.log(socket.user.name + " asked for rooms");

    this.DBManager.getRooms().then(function (rooms) {
        if (rooms != "NO_ROWS_FOUND") {
	  callback(new ServerResponse(MyUtils.serverResponse.SUCCESS, rooms));
        } else {
	  callback(new ServerResponse(MyUtils.serverResponse.ERROR, "NO_ROOMS"));
        }
    }).catch(MyUtils.getErrorFunction("Failed to get rooms", callback));
};

/**
 * create room
 */
RoomLogic.prototype.createRoom = function (socket, roomName, initialCubeNumber, password, ownerId, callback) {

    var self = this;

    Util.log("room created with name " + roomName + " by user = " + socket.user.name);

    self.DBManager.getRoomByName(roomName).then(function (room) {
        //check if room exist
        if (room.id == null) {
	  self.DBManager.createRoom(roomName, initialCubeNumber, password, ownerId).then(function (room) {
	      callback(new ServerResponse(MyUtils.serverResponse.SUCCESS, room));
	  }).catch(MyUtils.getErrorFunction("Failed to clean inactive rooms"));
        } else {

	  callback(new ServerResponse(MyUtils.serverResponse.ERROR, "ALREADY_EXIST"));
        }
    }).catch(MyUtils.getErrorFunction("Failed to get room by name", callback));
};

/**
 * on user exit from room
 */
RoomLogic.prototype.exitRoom = function (socket, userId, sockets, callback) {
    var self = this;

    Util.log(socket.user.name + " left his room");

    self.DBManager.getUserById(userId).then(function (user) {

        //remove socket room id
        socket.roomId = null;

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

		    //if it's not the first round and player left - decrease score
		    self.sharedLogic.setLeftPlayerScore(room, user);

		    //save user
		    self.DBManager.saveUser(user).then(function () {

		        //get room's users
		        self.DBManager.getUsersByRoomId(currentRoomId).then(function (users) {

			  //create gameLogic instance
			  var GameLogic = require('./GameLogic');
			  var gameLogic = new GameLogic();

			  //save users turns
			  self.DBManager.saveUsers(gameLogic.setTurnsOrder(users)).then(function () {

			      //if the number of the current players in the room is bigger than 2
			      if (users.length >= 2) {
				//if live players at least 2, restart round
				if (MyUtils.getNumberOfLivePlayers(users) >= 2) {
				    gameLogic.restartRound(room.id, sockets, users.length, data);
				} else {//if there are at least 2 players, but maximum 1 is alive, restart game.
				    gameLogic.restartGame(null, room.id, sockets, MyUtils.pushCase.GAME_RESTARTED, null, callback, null);
				}
			      } else {//in other case, just update the game
				self.sharedLogic.pushForRoomUsers(sockets, MyUtils.pushCase.UPDATE_GAME, room.id);
			      }
			      callback({
				response: MyUtils.serverResponse.SUCCESS,
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
		    self.sharedLogic.pushForRoomUsers(sockets, MyUtils.pushCase.UPDATE_GAME, room.id);

		    callback({
		        response: MyUtils.serverResponse.SUCCESS,
		        result: "no data"
		    });
		});
	      }
	  });
        });
    });
};

/**
 * enter to room
 * @param roomId
 * @param userId
 * @param callback
 */
RoomLogic.prototype.enterRoom = function (socket, roomId, userId, sockets, callback) {
    var self = this;

    Util.log("user = " + socket.user.name + " entered to roomId = " + roomId);

    self.DBManager.getUserById(userId).then(function (user) {
        //set room id
        user.roomId = roomId;

        //by default not play when entering
        user.isLoggedIn = false;

        //save the user
        return self.DBManager.saveUser(user).then(function () {
	  return user;
        }).catch(MyUtils.getErrorFunction("Failed to enter rooms", callback));
    }).then(function (user) {

        //get the room
        self.DBManager.getRoomById(roomId, true).then(function (room) {

	  //create gameLogic instance
	  var GameLogic = require('./GameLogic');
	  var gameLogic = new GameLogic();

	  //get users in the room
	  var usersInRoom = room.users;

	  //if it was only one player in the room and now its 2 players - restart the game
	  if (usersInRoom.length == 2) {
	      gameLogic.restartGame(usersInRoom[0].id, roomId, sockets, MyUtils.pushCase.GAME_RESTARTED, null, callback);
	  } else { //game already played before
	      callback({
		response: MyUtils.serverResponse.SUCCESS,
		result: user
	      });

	      //send push for all the room's users
	      self.sharedLogic.pushForRoomUsers(sockets, MyUtils.pushCase.UPDATE_GAME, roomId);
	  }
        });
    }).catch(MyUtils.getErrorFunction("Failed to enter the room", callback));
};

/**
 * clean inactive rooms
 * @param sockets
 */
RoomLogic.prototype.cleanInActiveRooms = function (sockets) {
    var self = this;

    self.DBManager.getRooms().then(function (rooms) {
        return rooms;
    }).then(function (rooms) {
        //iterate rooms
        rooms.forEach(function (room) {

            //4 days
	  var inActiveTimeToDelete = (1000 * 60 * 60 * 24) * 4;
	  // var inActiveTimeToDelete = 1000 * 60;

	  //if inactive for X days
	  if ((room.updatedAt.valueOf() + inActiveTimeToDelete) < new Date().valueOf()) {

	      Util.log("clean roomId = " + room.id + " for inactive");

	      //clean room cubes
	      self.DBManager.clearRoomCubes(room.id).then(function () {
		//delete the room
		return self.DBManager.deleteRoom(room.id);
	      }).then(function () {
		self.sharedLogic.pushForRoomUsers(sockets, MyUtils.pushCase.NEW_ROOM_CREATED, null, "no data");
	      }).catch(MyUtils.getErrorFunction("Failed to clean inactive rooms"));
	  }
        });
    }).catch(MyUtils.getErrorFunction("Failed to clean inactive rooms"));
};

module.exports = RoomLogic;