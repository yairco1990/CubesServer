/**
 * Created by Yair on 10/11/2016.
 */
angular.module('MyCubes.controllers.dashboard-page', [])

    .controller('DashboardCtrl', DashboardCtrl);

function DashboardCtrl($scope, requestHandler, $http, $state, $ionicPopup, $myPlayer, $timeout, $log, $window, dashboardPlayer) {
    var vm = this;

    vm.$scope = $scope;
    vm.$state = $state;
    vm.$myPlayer = $myPlayer;
    vm.$timeout = $timeout;
    vm.$log = $log;
    vm.$window = $window;
    vm.dashboardPlayer = dashboardPlayer;

    vm.initCtrl();
}

DashboardCtrl.prototype.initCtrl = function () {
    var vm = this;

    vm.$log.info('DashboardCtrl loaded');
};

DashboardCtrl.prototype.openRooms = function () {
    var vm = this;

    vm.$state.go('rooms');
};

DashboardCtrl.prototype.openRules = function () {
    var vm = this;

    vm.$state.go('rules');
};

DashboardCtrl.prototype.openScores = function () {
    var vm = this;

    vm.$state.go('scores');
};

DashboardCtrl.prototype.logout = function () {
    var vm = this;

    var localStoragePlayer = vm.$window.localStorage.removeItem('player');

    vm.$myPlayer.setPlayerToNull();

    vm.$state.go('login');
};
