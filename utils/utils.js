/**
 * Created by Yair on 2/20/2017.
 */

var Utils = {
    serverResponse: {
        SUCCESS: "success",
        ERROR: "error"
    },

    pushCase: {
        SESSION_ENDED: "sessionEnded",
        PLAYER_GAMBLED: "playerGambled",
        GAME_OVER: "gameOver",
        GAME_RESTARTED: "gameRestarted",
        UPDATE_GAME: "updateGame"
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

    generateArrayOfUsersIds: function (users) {
        var array = [];

        users.forEach(function (user) {
            array.push(user.id);
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
    }
};

module.exports = Utils;
