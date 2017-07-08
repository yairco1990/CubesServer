var Utils = require('../utils/utils');
var Util = require('util');

function SharedLogic() {
    this.DBManager = require('../dal/DBManager');
}

/**
 * set winner score when the game ended
 * @param numOfPlayers - number of players that played in this room session
 * @param winner - the winner player object
 */
SharedLogic.prototype.setWinnerScore = function (numOfPlayers, winner) {

    var self = this;

    winner.wins++;
    winner.games++;
    //score depends on number of players
    var winnerScore = 125;
    switch (numOfPlayers) {
        case 1:
	  winnerScore = 1;
	  break;
        case 2:
	  winnerScore = 25;
	  break;
        case 3:
	  winnerScore = 50;
	  break;
        case 4:
	  winnerScore = 75;
	  break;
        case 5:
	  winnerScore = 100;
	  break;
    }
    winner.score += winnerScore;

    self.DBManager.saveUser(winner).then(function () {
        Util.log("user saved after game over");
    }).catch(function (err) {
        Util.log(err);
        Util.log("failed to save users after game over");
    });
};

/**
 * set perfect score - if player gambled exactly on the amount of dice, and the next player said 'its a lie'
 * @param playerId - the perfect gambler
 */
SharedLogic.prototype.setPerfectScore = function (playerId) {

    var self = this;

    self.DBManager.getUserById(playerId).then(function (winner) {
        //5 point for perfect gamble
        winner.score += 5;
        return winner;
    }).then(function (winner) {
        return self.DBManager.saveUser(winner);
    }).catch(function () {
        Util.log("Error during update the winner score(setPerfectScore)");
    });
};

/**
 * set score for player that left the room
 * @param room - the room that the user left
 * @param player - the player that left
 */
SharedLogic.prototype.setLeftPlayerScore = function (room, player) {
    //if it's not the first round and player left - decrease score
    if (!room.firstRound) {
        player.score -= 23;
    }

    //min score is 0
    if (player.score < 0) {
        player.score = 0;
    }
};

/**
 * set score for the user that expose the bluffer
 * @param playerId - the player id of the one that exposed the bluff
 */
SharedLogic.prototype.setRoundScore = function (playerId) {

    var self = this;

    self.DBManager.getUserById(playerId).then(function (player) {

        player.score += 3;
        return player;

    }).then(function (player) {

        return self.DBManager.saveUser(player);
    }).then(function () {

    }).catch(function (e) {
        Util.log(e);
        Util.log("Error during update the player score(setRoundScore)");
    });
};

/**
 * send push for room's sockets
 * @param roomSockets
 * @param type
 * @param roomId
 * @param data
 */
SharedLogic.prototype.pushForRoomUsers = function (roomSockets, type, roomId, data) {

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

module.exports = SharedLogic;