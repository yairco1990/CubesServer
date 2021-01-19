/**
 * Created by Yair on 10/11/2016.
 */
angular.module('MyCubes.controllers.rules-page', [])

    .controller('RulesCtrl', RulesCtrl);

function RulesCtrl($scope, $log) {
    var vm = this;

    vm.$scope = $scope;
    vm.$log = $log;

    vm.initCtrl();
}

RulesCtrl.prototype.initCtrl = function () {
    var vm = this;

    vm.$log.info('RulesCtrl loaded');
};
