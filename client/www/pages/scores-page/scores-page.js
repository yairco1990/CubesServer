/**
 * Created by Yair on 10/11/2016.
 */
angular.module('MyCubes.controllers.scores-page', [])

    .controller('ScoresCtrl', ScoresCtrl);

function ScoresCtrl($scope, $log, requestHandler, topUsers) {
    var vm = this;

    vm.$scope = $scope;
    vm.$log = $log;
    vm.requestHandler = requestHandler;
    vm.topScoreUsers = topUsers;

    vm.initCtrl();
}

ScoresCtrl.prototype.initCtrl = function () {
    var vm = this;

    vm.$log.info('ScoresCtrl loaded');
};
