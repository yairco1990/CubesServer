/**
 * Created by Yair on 10/11/2016.
 */
angular.module('MyCubes.controllers.create-room-page', [])

  .controller('CreateRoomCtrl', function ($scope, $http, $state, $myPlayer, $window, $rootScope, $log, requestHandler, $timeout, $ionicPopup) {

    $log.debug("init create room ctrl");

    //init
    $scope.room = {};

    /**
     * create room
     */
    $scope.createRoom = function () {

      //validate
      if ($scope.room.initialCubeNumber > 5 || $scope.room.initialCubeNumber < 1) {
        return;
      }
      if (!$scope.room.name) {
        return;
      }

      requestHandler.createRequest({
        event: 'createRoom',
        params: {
          roomName: $scope.room.name,
          initialCubeNumber: $scope.room.initialCubeNumber,
          password: $scope.room.password,
          userId: $myPlayer.getId()
        },
        onSuccess: function () {

          //show success popup
          var alertPopup = $ionicPopup.show({
            title: 'Room created successfully!'
          });

          $rootScope.getRooms && $rootScope.getRooms();

          //close popup after 3 seconds and move to rooms
          $timeout(function () {
            alertPopup.close();
            $scope.backToRooms();
          }, 1500);

        },
        onError: function (error) {
          $log.error("failed to create room", error);

          if (error == "ALREADY_EXIST") {
            $ionicPopup.alert({
              title: "Failed to create room",
              subTitle: "Room with this name already exist"
            }).then();
          } else {
            $ionicPopup.alert({
              title: "Failed to create room",
              subTitle: "Try later"
            }).then();
          }
        }
      });
    };

    /**
     * logout
     */
    $scope.backToRooms = function () {
      $state.go('rooms');
    };

  });
