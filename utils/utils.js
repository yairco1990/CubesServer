/**
 * Created by Yair on 2/20/2017.
 */
var Util = require('util');
var ServerResponse = require('./ServerResponse');

var Utils = {
    serverResponse: {
        SUCCESS: "success",
        ERROR: "error",
        SERVER_ERROR: "server_error"
    },

    pushCase: {
        SESSION_ENDED: "sessionEnded",
        PLAYER_GAMBLED: "playerGambled",
        GAME_OVER: "gameOver",
        GAME_RESTARTED: "gameRestarted",
        UPDATE_GAME: "updateGame",
        NEW_MESSAGE: "newMessage",
        NEW_ROOM_CREATED: "newRoomCreated",
        SAID_BLUFF: "saidBluff",
        PLAYER_WON: "playerWon"
    },

    /**
     * remove from array
     * @param array
     * @param value
     * @returns {*}
     */
    removeFromArray: function (array, value) {
        for (var i = 0; i < array.length; i++) {
	  if (array[i].id == value.id) {
	      array.splice(i, 1);
	      break;
	  }
        }
        return array;
    },

    generateArrayOfUsersIds: function (users, onlyLoggedIn) {
        var array = [];

        users.forEach(function (user) {
	  if (!onlyLoggedIn || (onlyLoggedIn && user.isLoggedIn)) {
	      array.push(user.id);
	  }
        });

        return array;
    },

    getUserById: function (users, id) {
        var selectedUser = null;
        users.forEach(function (user) {
	  if (user.id == id) {
	      selectedUser = user;
	  }
        });
        return selectedUser;
    },

    getErrorFunction: function (errorMessage, cb, response, result) {

        var self = this;

        return function (err) {
	  Util.log(errorMessage);
	  Util.log(err);

	  if (cb) {
	      if (!response) {
		response = self.serverResponse.ERROR;
	      }
	      cb(new ServerResponse(response, result));
	  }
        };
    },

    getNumberOfLivePlayers: function (users) {
        var self = this;

        if (users && users.length) {
	  var count = 0;
	  users.forEach(function (user) {
	      if (user.isLoggedIn) {
		count++;
	      }
	  });
	  return count
        }
        return 0;
    }
};

module.exports = Utils;
