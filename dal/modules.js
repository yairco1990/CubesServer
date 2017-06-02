var Sequelize = require('sequelize');

module.exports = {
    room: {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            unique: true,
            autoIncrement: true
        },
        name: {
            type: Sequelize.STRING,
            allowNull: false
        },
        password: Sequelize.STRING,
        numOfCubes: Sequelize.INTEGER,
        lastGambleCube: Sequelize.INTEGER,
        lastGambleTimes: Sequelize.INTEGER,
        isGameOn: Sequelize.BOOLEAN,
        initialCubeNumber: Sequelize.INTEGER
    },

    user: {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            unique: true
        },
        name: {
            type: Sequelize.STRING,
            allowNull: false
        },
        password: Sequelize.STRING,
        isLoggedIn: Sequelize.BOOLEAN,
        gambleCube: Sequelize.INTEGER,
        gambleTimes: Sequelize.INTEGER,
        currentNumOfCubes: Sequelize.INTEGER,
        socketId: Sequelize.STRING
    },

    cube: {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            unique: true
        },
        cubeNum: Sequelize.INTEGER
    }
};