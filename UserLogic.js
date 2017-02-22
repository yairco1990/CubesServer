//utils library
var Utils = require('./utils');

var DBManager = require('./DBManager');

function UserLogic() {
    this.DBManager = DBManager.getDBManager();
}

/**
 * login function
 * @param username
 * @param password
 * @param callback
 */
UserLogic.prototype.login = function (username, password, callback) {

    this.DBManager.getUserByName(username).then(function (user) {
        if (user != "NO_ROWS_FOUND") {
            if (user.password == password) {
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

module.exports = UserLogic;