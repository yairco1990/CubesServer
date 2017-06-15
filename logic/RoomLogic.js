//utils library
var MyUtils = require('../utils/utils');
var Util = require('util');
var ServerResponse = require('../utils/ServerResponse');

function RoomLogic() {
    this.DBManager = require('../dal/DBManager');
    this.SharedLogic = new (require('./SharedLogic'));
}

/**
 * get rooms function
 * @param callback
 */
RoomLogic.prototype.getRooms = function (callback) {

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
RoomLogic.prototype.createRoom = function (roomName, initialCubeNumber, password, ownerId, callback) {

    var self = this;

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
 * enter to room
 * @param roomId
 * @param userId
 * @param callback
 */
RoomLogic.prototype.enterRoom = function (roomId, userId, sockets, callback) {
    var self = this;

    self.DBManager.getUserById(userId).then(function (user) {
        //set room id
        user.roomId = roomId;

        //by default not play when entering
        user.isLoggedIn = false;

        //save the user
        return self.DBManager.saveUser(user).then(function () {
	  return user;
        }).catch(MyUtils.getErrorFunction("Failed to clean inactive rooms", callback));
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
	      self.DBManager.pushForRoomUsers(sockets, MyUtils.pushCase.UPDATE_GAME, roomId);
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
        //iterate the rooms
        rooms.forEach(function (room) {

	  var inActiveTimeToDelete = 1000 * 60 * 60 * 24 * 20;
	  // var inActiveTimeToDelete = 1000 * 60;

	  //if inactive for X days
	  if ((room.updatedAt.valueOf() + inActiveTimeToDelete) < new Date().valueOf()) {

	      Util.log("clean roomId = " + room.id + " for inactive");

	      //clean room cubes
	      self.DBManager.clearRoomCubes(room.id).then(function () {
		//delete the room
		return self.DBManager.deleteRoom(room.id);
	      }).then(function () {
		self.DBManager.pushForRoomUsers(sockets, MyUtils.pushCase.NEW_ROOM_CREATED, null, "no data");
	      }).catch(MyUtils.getErrorFunction("Failed to clean inactive rooms"));
	  }
        });
    }).catch(MyUtils.getErrorFunction("Failed to clean inactive rooms"));
};

module.exports = RoomLogic;