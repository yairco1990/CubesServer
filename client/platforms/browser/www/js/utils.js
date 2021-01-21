/**
 * Created by Asus on 22/04/2015.
 */

// hebrew dates
//moment.locale('he');

/**
 * check if parameter is undefined of null
 * @param val
 * @returns {boolean|*}
 */
function isNull(val) {
    return angular.isUndefined(val) || val === null;
}

/**
 * check if the given value is null or an empty array/string
 * @param val
 * @returns {boolean}
 */
function isNullOrEmpty(val) {
    return isNull(val) || val.length == 0;
}

/**
 * check if the parameter is not null nor undefined
 * @param val
 * @returns {boolean}
 */
function isNotNull(val) {
    return !isNull(val);
}

function isInt(n) {
    return Number(n) === n && n % 1 === 0;
}


/**
 * get a sortable function that sorts any given array by the given property name
 * @param property
 * @returns {Function}
 */
function getSortableByPropertyName(property, reverse) {
    if (reverse !== true) {
        reverse = false;
    }

    return function (o1, o2) {
        if (o1[property] && o2[property]) {
            if (o1[property] > o2[property]) {
                return reverse ? -1 : 1;
            } else if (o1[property] < o2[property]) {
                return reverse ? 1 : -1;
            }

            return 0;
        }

        return o2[property] ? -1 : 1;
    };
}

var MyUtils = {
    /**
     * get user by id
     * @param users
     * @param id
     * @returns {*}
     */
    getUserById: function (users, id) {
        var selectedUser = users[0];
        users.forEach(function (user) {
            if (user.id == id) {
                selectedUser = user;
            }
        });
        return selectedUser;
    },

    isInTheList: function (list, obj) {
        var isInTheList = false;
        list.forEach(function (item) {
            if (item == obj) {
                isInTheList = true;
            }
        });
        return isInTheList;
    },

    stringToColour: function (str) {
        var hash = 0;
        for (var i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        var colour = '#';
        for (var i = 0; i < 3; i++) {
            var value = (hash >> (i * 8)) & 0xFF;
            colour += ('00' + value.toString(16)).substr(-2);
        }
        return colour;
    }
};
