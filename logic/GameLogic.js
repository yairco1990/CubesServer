//utils library
var Utils = require('../utils/utils');
var Util = require('util');
var async = require('async');
var ServerResponse = require('../utils/ServerResponse');

function GameLogic() {
    this.DBManager = require('../dal/DBManager');
    this.sharedLogic = new (require('./SharedLogic'));
}

/**
 * restart room
 * @param userId
 * @param roomId
 * @param sockets
 * @param pushType
 * @param endRoundResult
 * @param callback
 */
GameLogic.prototype.restartGame = function (userId, roomId, sockets, pushType, endRoundResult, callback, onFinish) {

    var self = this;

    Util.log(roomId + " restarted with starting user user = " + userId);

    async.parallel({
        room: function (callback) {
	  //get the room
	  self.DBManager.getRoomById(roomId).then(function (room) {
	      return callback(null, room);
	  });
        },

        users: function (callback) {
	  self.DBManager.getUsersByRoomId(roomId).then(function (users) {
	      return callback(null, users)
	  });
        }
    }, function (err, result) {
        if (err) {
	  Util.error(err);
	  callback && callback({
	      response: Utils.serverResponse.SERVER_ERROR
	  });
	  return;
        }

        var room = result.room;
        var users = result.users;

        if (users.length >= 2) {

	  async.series({
	      //clear the room cubes
	      clearRoomCubes: function (callback) {
		self.DBManager.clearRoomCubes(roomId).then(function () {
		    callback(null, "success");
		});
	      },

	      //set cubes for all users in room
	      setCubesForUsers: function (callback) {
		Promise.all(self.setCubesForUsersInRoom(users, room.initialCubeNumber)).then(function () {

		    //update num of cubes for each user
		    users.forEach(function (user) {
		        user.currentNumOfCubes = room.initialCubeNumber;
		        user.isLoggedIn = true;
		        user.gambleCube = null;
		        user.gambleTimes = null;
		        user.isAutoLie = false;
		    });

		    //set users turns
		    users = self.setTurnsOrder(users);

		    //save the users
		    self.DBManager.saveUsers(users).then(function () {
		        callback(null, "success");
		    });
		})
	      },

	      //set room details
	      setRoomDetails: function (callback) {
		room.currentUserTurnId = userId ? userId : users[0].id;
		room.lastGambleCube = null;
		room.lastGambleTimes = null;
		room.firstRound = true;
		room.sessionPlayers = users.length;

		callback(null, self.DBManager.saveRoom(room));
	      },

	      sendPush: function (callback) {
		Util.log("room restarted successfully");

		pushType = pushType ? pushType : Utils.pushCase.GAME_RESTARTED;

		//send push for all the room's users
		self.sharedLogic.pushForRoomUsers(sockets, pushType, roomId, endRoundResult);

		callback(null);
	      }
	  }, function (err, result) {
	      if (err) {
		Util.error(err);
		callback({response: Utils.serverResponse.SERVER_ERROR});
		return;
	      }

	      callback && callback({
		response: Utils.serverResponse.SUCCESS,
		result: "no data"
	      });

	      //for save the users new score
	      onFinish && onFinish(users);
	  });
        } else {
	  callback && callback({
	      response: Utils.serverResponse.ERROR,
	      result: "there is just one user or less in the room"
	  })
        }
    });
};

GameLogic.prototype.setCubesForUsersInRoom = function (users, numOfCubes) {

    var self = this;

    var promises = [];

    users.forEach(function (user) {

        var numOfCubesForUser = numOfCubes ? numOfCubes : user.currentNumOfCubes;
        for (var i = 0; i < numOfCubesForUser; i++) {
	  var cube = {
	      cubeNum: Math.floor((Math.random() * 6) + 1),
	      roomId: user.roomId,
	      userId: user.id
	  };

	  promises.push(self.DBManager.Cube.create(cube));
        }
    });

    return promises;
};

/**
 * getGame function
 * @param roomId
 * @param callback
 * @param userId
 */
GameLogic.prototype.getGame = function (roomId, userId, callback) {

    var self = this;

    async.parallel({
	  room: function (callback) {
	      self.DBManager.getRoomById(roomId).then(function (room) {
		return callback(null, room);
	      });
	  },
	  users: function (callback) {
	      self.DBManager.getUsersByRoomId(roomId, userId).then(function (users) {
		return callback(null, users);
	      });
	  }
        },
        function (err, result) {
	  if (err) {
	      Util.error(err);
	      callback({
		response: Utils.serverResponse.ERROR,
		result: "SERVER_ERROR"
	      });
	      return;
	  }

	  if (result.users != "NO_ROWS_FOUND" && result.room != "NO_ROWS_FOUND") {
	      callback({
		response: Utils.serverResponse.SUCCESS,
		result: {
		    users: result.users,
		    room: result.room
		}
	      });
	  } else {
	      callback({
		response: Utils.serverResponse.ERROR,
		result: "NO_USERS_OR_ROOM"
	      });
	  }
        }
    );
};

/**
 * restart the round - if some player left the room for example.
 * @param roomId
 * @param sockets
 * @param numOfUsersInRoom
 * @param data
 */
GameLogic.prototype.restartRound = function (roomId, sockets, numOfUsersInRoom, data) {

    var self = this;

    Util.log("restart the round. roomId -> " + roomId);

    async.parallel({
        room: function (callback) {
	  //get the room
	  self.DBManager.getRoomById(roomId).then(function (room) {
	      return callback(null, room);
	  });
        },

        clearCubes: function (callback) {
	  self.DBManager.clearRoomCubes(roomId).then(function () {
	      callback(null);
	  })
        },

        users: function (callback) {
	  self.DBManager.getUsersByRoomId(roomId).then(function (users) {
	      return callback(null, users)
	  });
        }

    }, function (err, result) {

        if (err) {
	  Util.log(err);
	  return;
        }

        var room = result.room;
        var users = result.users;

        //set auto lie to false when the round beginning
        users.forEach(function (user) {
	  user.isAutoLie = false;
	  user.gambleTimes = null;
	  user.gambleCube = null;
        });

        //init gamble details
        room.lastGambleCube = null;
        room.lastGambleTimes = null;

        //set cubes only if two or more playing
        if (numOfUsersInRoom >= 2) {

            //save room
	  self.DBManager.saveRoom(room).then(function () {
	      //save the users
	      self.DBManager.saveUsers(users).then(function () {
		//set cubes for users in room
		return Promise.all(self.setCubesForUsersInRoom(users, null));
	      }).then(function () {
		//update the users
		self.sharedLogic.pushForRoomUsers(sockets, Utils.pushCase.SESSION_ENDED, room.id, data);
	      });
	  });

        } else { // 1 player or less - clean the room
	  room.currentUserTurnId = null;
	  room.lastUserTurnId = null;

	  self.DBManager.saveRoom(room).then(function () {
	      self.sharedLogic.pushForRoomUsers(sockets, Utils.pushCase.SESSION_ENDED, room.id, data);
	  });
        }
    });
};

/**
 * set gamble to room
 * @param socket
 * @param userId
 * @param roomId
 * @param gambleTimes
 * @param gambleCube
 * @param isLying
 * @param callback
 * @param sockets
 */
GameLogic.prototype.setGamble = function (socket, userId, roomId, gambleTimes, gambleCube, isLying, callback, sockets) {

    var self = this;

    Util.log("setGamble -> user = " + socket.user.name + ", roomId " + roomId + " gambleTimes = " + gambleTimes + ", gambleCube = " + gambleCube + ", isLying = " + isLying);

    async.parallel({
        user: function (cb) {
	  self.DBManager.getUserById(userId).then(function (user) {
	      cb(null, user);
	  }).catch(function (err) {
	      cb(err);
	  });
        },

        room: function (cb) {
	  self.DBManager.getRoomById(roomId).then(function (room) {
	      cb(null, room);
	  }).catch(function (err) {
	      cb(err);
	  });
        },

        users: function (cb) {
	  self.DBManager.getUsersByRoomId(roomId).then(function (users) {
	      cb(null, users);
	  }).catch(function (err) {
	      cb(err);
	  });
        }
    }, function (err, result) {

        //case of error
        if (err) {
	  Util.log(err);
	  callback(new ServerResponse(Utils.serverResponse.ERROR, err.toString()));
	  return;
        }

        var user = result.user;
        var room = result.room;
        var users = result.users;

        if (!socket.isGambling) {
	  socket.isGambling = true;
	  //if the current user set lie - check last gamble
	  if (isLying) {
	      //notify user that the player said bluff
	      self.sharedLogic.pushForRoomUsers(sockets, Utils.pushCase.SAID_BLUFF, roomId, user);
	      self.setLyingGamble(socket, user, room, users, sockets, callback);

	  } else {//case of regular gamble(no one said lye)
	      self.setRaiseGamble(socket, user, gambleCube, gambleTimes, room, sockets, callback);
	  }
        }
    });
};

/**
 * case of player raised the gamble
 */
GameLogic.prototype.setRaiseGamble = function (socket, user, gambleCube, gambleTimes, room, sockets, callback) {

    var self = this;

    user.gambleCube = gambleCube;
    user.gambleTimes = gambleTimes;

    //save the user
    self.DBManager.saveUser(user)
        .then(function () {
	  room.lastGambleCube = gambleCube;
	  room.lastGambleTimes = gambleTimes;
	  room.lastUserTurnId = user.id;
	  room.currentUserTurnId = user.nextUserTurnId;

	  return room;
        })
        .then(function (room) {
	  return self.DBManager.saveRoom(room);
        })
        .then(function () {
	  //send push
	  self.sharedLogic.pushForRoomUsers(sockets, Utils.pushCase.PLAYER_GAMBLED, room.id);

	  //return success
	  callback(new ServerResponse(Utils.serverResponse.SUCCESS, {}));
	  socket.isGambling = false;
        })
        //error case
        .catch(function (err) {
	  Util.log(err);
	  callback(new ServerResponse(Utils.serverResponse.ERROR, err.toString()));
	  socket.isGambling = false;
        });
};

/**
 * in case of player said 'its a bluff'
 */
GameLogic.prototype.setLyingGamble = function (socket, user, room, users, sockets, callback) {

    var self = this;

    //set original users for sending all user's cubes to all the users(deep copy)
    var originalUsers = JSON.parse(JSON.stringify(users));

    //get the last gamble
    var lastGambleTimes = room.lastGambleTimes;
    var lastGambleCube = room.lastGambleCube;

    var result;

    var endRoundResult = {
        sayLying: user.name,
        gambleCube: lastGambleCube,
        gambleTimes: lastGambleTimes
    };

    var correctCubesCounter = 0;

    //start from -1, because someone need to drop cube
    var allCubesCounter = -1;

    users.forEach(function (userInRoom) {

        //set auto lie to false
        userInRoom.isAutoLie = false;

        //iterate over the users cubes
        userInRoom.cubes.forEach(function (cube) {

	  allCubesCounter++;

	  //if the cube num equals to the gamble or equals to 1 - add to counter
	  if (cube.cubeNum == lastGambleCube || cube.cubeNum == 1) {
	      correctCubesCounter++;
	  }
        });
    });

    var wrongGamblerId = null;
    var winnerGamblerId = null;
    //if the gamble equals to the actual result
    var isPerfectGamble = (lastGambleTimes == correctCubesCounter);

    //check if the gamble correct or not
    //if the last gamble is too high
    if (lastGambleTimes > correctCubesCounter) {
        endRoundResult.isRight = true;

        //if wrong gamble - minus cube to last user
        wrongGamblerId = room.lastUserTurnId;
        winnerGamblerId = room.currentUserTurnId;

        result = "WRONG_GAMBLE";
    } else {
        endRoundResult.isRight = false;

        //if good gamble - minus cube to current user
        wrongGamblerId = room.currentUserTurnId;
        winnerGamblerId = room.lastUserTurnId;

        result = "CORRECT_GAMBLE";
    }

    //set room details
    room.numOfCubes = allCubesCounter;
    room.lastGambleCube = null;
    room.lastGambleTimes = null;
    room.lastUserTurnId = null;
    room.currentUserTurnId = wrongGamblerId;
    //on the first time that someone says lie - its not the first round
    room.firstRound = false;

    //
    async.waterfall([
        function getLooser(callback) {
	  //get the loser
	  self.DBManager.getUserById(wrongGamblerId).then(function (wrongGambler) {
	      //minus cube for the loser
	      wrongGambler.currentNumOfCubes--;
	      wrongGambler.isAutoLie = false;

	      //check game over for this user
	      if (wrongGambler.currentNumOfCubes < 1) {
		wrongGambler.games++;
		wrongGambler.isLoggedIn = false;
		users = Utils.removeFromArray(users, wrongGambler);
		room.currentUserTurnId = wrongGambler.nextUserTurnId;

		users = self.setTurnsOrder(users);
	      }

	      callback(null, wrongGambler);
	  }).catch(function (err) {
	      callback(err);
	  });
        },

        function saveUsers(wrongGambler, callback) {
	  //save users
	  self.DBManager.saveUsers(users).then(function () {
	      callback(null, wrongGambler);
	  }).catch(function (err) {
	      callback(err);
	  });
        },

        function saveRoom(wrongGambler, callback) {
	  //save the room
	  self.DBManager.saveRoom(room).then(function () {
	      callback(null, wrongGambler);
	  }).catch(function (err) {
	      callback(err);
	  });
        },

        function saveWrongGambler(wrongGambler, callback) {
	  //save the gambler
	  self.DBManager.saveUser(wrongGambler).then(function () {
	      callback(null, wrongGambler);
	  }).catch(function (err) {
	      callback(err);
	  });
        },

        function getUpdatedRoom(wrongGambler, callback) {
	  //get the updated room
	  self.DBManager.getUsersByRoomId(room.id).then(function (updatedUsers) {
	      callback(null, updatedUsers);
	  }).catch(function (err) {
	      callback(err);
	  });
        },

        function clearRoomCubes(updatedUsers, callback) {
	  //clear the room cubes
	  self.DBManager.clearRoomCubes(room.id).then(function () {

	      var userCounter = 0;

	      //set gambles to null for each user
	      updatedUsers.forEach(function (updatedUser) {
		updatedUser.gambleCube = null;
		updatedUser.gambleTimes = null;

		//save user
		self.DBManager.saveUser(updatedUser).then(function () {

		    //set user cubes if still playing
		    if (updatedUser.isLoggedIn) {
		        Promise.all(self.setCubesForUser(updatedUser)).then(function () {
			  Util.log("set cubes for userId - ", updatedUser.name);
			  userCounter++;
			  if (userCounter == self.getPlayingUsers(updatedUsers).length) {

			      //get the winner if exist
			      var winner = self.isGameOver(updatedUsers);

			      //set round result payload
			      endRoundResult.wrongId = wrongGamblerId;
			      endRoundResult.winnerId = winnerGamblerId;
			      var usersData = {
				users: originalUsers,
				endRoundResult: endRoundResult
			      };

			      //notify on the result after 2 seconds
			      setTimeout(function () {
				if (winner != null) {

				    result = "WINNER_ROUND";

				    //notify about the winner
				    self.sharedLogic.pushForRoomUsers(sockets, Utils.pushCase.PLAYER_WON, room.id, winner);

				    //init the room
				    self.restartGame(winner.id, room.id, sockets, Utils.pushCase.GAME_OVER, usersData, null, function (users) {
				        //get the updated winner after game restarted
				        var updatedWinner = Utils.getUserById(users, winner.id);
				        //update winner score
				        self.sharedLogic.setWinnerScore(room.sessionPlayers, updatedWinner);
				    });

				} else {

				    self.sharedLogic.pushForRoomUsers(sockets, Utils.pushCase.SESSION_ENDED, room.id, usersData);

				    //set round score for the winner
				    self.sharedLogic.setRoundScore(winnerGamblerId);
				}

				callback(null, result);
			      }, 2200);
			  }
		        }).catch(function (err) {
			  callback(err);
		        });
		    }
		}).catch(function (err) {
		    callback(err);
		});
	      })
	  }).catch(function (err) {
	      callback(err);
	  });
        }

    ], function (err, result) {
        //case of error
        if (err) {
	  Util.log(err);
	  callback(new ServerResponse(Utils.serverResponse.ERROR, err.toString()));
	  return;
        }

        callback(new ServerResponse(Utils.serverResponse.SUCCESS, result));
        socket.isGambling = false;

        //if perfect gamble - set score
        if (isPerfectGamble) {
	  self.sharedLogic.setPerfectScore(winnerGamblerId);
        }
    });
};

/**
 * send message to room's users
 */
GameLogic.prototype.sendMessage = function (socket, userId, content, sockets, callback) {
    var self = this;

    async.waterfall([
        function (callback) {
	  self.DBManager.getUserById(userId).then(function (user) {
	      callback(null, user);
	  });
        },
        function (user, callback) {
	  self.DBManager.getRoomById(user.roomId).then(function (room) {
	      callback(null, {room: room, user: user});
	  });
        }
    ], function (err, result) {

        if (err) {
	  Util.log(err);
	  return;
        }

        var room = result.room;
        var user = result.user;

        var message = {
	  userId: userId,
	  name: user.name,
	  content: content
        };

        callback({
	  response: Utils.serverResponse.SUCCESS,
	  result: message
        });

        self.sharedLogic.pushForRoomUsers(sockets, Utils.pushCase.NEW_MESSAGE, room.id, message);
    });
};

/**
 * some user set auto lye - update the room's users
 * @param socket
 * @param isAutoLie
 * @param sockets
 * @param callback
 */
GameLogic.prototype.setAutoLie = function (socket, isAutoLie, sockets, callback) {
    var self = this;

    Util.log("set auto lie. userId -> " + socket.user.id);

    //get user and room
    var socketUser = socket.user;
    var roomId = socket.roomId;

    //set data
    var data = {
        userId: socketUser.id,
        isAutoLie: isAutoLie
    };

    self.sharedLogic.pushForRoomUsers(sockets, Utils.pushCase.SET_AUTO_LIE, roomId, data);

    self.DBManager.getUserById(socketUser.id).then(function (user) {
        user.isAutoLie = isAutoLie;

        return self.DBManager.saveUser(user);
    }).then(function () {
        callback({
	  response: Utils.serverResponse.SUCCESS,
	  result: data
        });
    });
};

/**
 * check if the game is over
 * @param users
 * @returns winner if exist or null
 */
GameLogic.prototype.isGameOver = function (users) {
    var numOfUserPlaying = 0;
    var winner = null;
    users.forEach(function (user) {
        if (user.currentNumOfCubes > 0) {
	  numOfUserPlaying++;
	  winner = user;
        }

        if (numOfUserPlaying > 1) {
	  winner = null;
        }
    });
    return winner;
};

/**
 * set cubes for user accordingly to his number of cubes
 * @param user
 * @param callback
 * @returns array of promises
 */
GameLogic.prototype.setCubesForUser = function (user, callback) {

    var self = this;

    var promises = [];

    for (var i = 0; i < user.currentNumOfCubes; i++) {
        var cube = {
	  cubeNum: Math.floor((Math.random() * 6) + 1),
	  roomId: user.roomId,
	  userId: user.id
        };
        promises.push(self.DBManager.Cube.create(cube));
    }

    return promises;
};

/**
 * set turns order
 * @param users
 * @returns list of users with fixed nextUserTurnId property
 */
GameLogic.prototype.setTurnsOrder = function (users) {

    if (users.length > 0) {
        //set array of user ids
        var idsArray = Utils.generateArrayOfUsersIds(users, true);

        //set next user turn for all except from the last one
        for (var i = 1; i < idsArray.length; i++) {
	  Utils.getUserById(users, idsArray[i - 1]).nextUserTurnId = idsArray[i];
        }
        //set next user turn for the last one
        Utils.getUserById(users, idsArray[idsArray.length - 1]).nextUserTurnId = idsArray[0];
    }

    return users;
};

/**
 * get playing users(login it's the sign that the user is playing and not lost yet)
 * @param users
 * @returns {Array}
 */
GameLogic.prototype.getPlayingUsers = function (users) {

    var playingUsers = [];

    users.forEach(function (user) {
        if (user.isLoggedIn) {
	  playingUsers.push(user);
        }
    });

    return playingUsers;
};


module.exports = GameLogic;