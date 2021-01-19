// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
angular.module('starter', [
    'ionic', 'ionic.service.core',
    'ui.router',
    'ngAnimate',
    'luegg.directives',

    //BOWER
    'ionic-numberpicker',
    'btford.socket-io',

    //SERVICES
    'MyCubes.services.request-handler',
    'MyCubes.services.alert-popup',
    'MyCubes.services.my-socket',
    'MyCubes.services.my-player',

    // DIRECTIVES
    'MyCubes.directives.loader',
    'MyCubes.directives.input',
    'MyCubes.directives.focusMe',

    //CONTROLLERS
    'MyCubes.controllers.rooms-page',
    'MyCubes.controllers.create-room-page',
    'MyCubes.controllers.game-page',
    'MyCubes.controllers.login-page',
    'MyCubes.controllers.dashboard-page',
    'MyCubes.controllers.rules-page',
    'MyCubes.controllers.scores-page',
    'MyCubes.controllers.register-page'
])

    .run(function ($rootScope, $ionicPlatform, $myPlayer, $state) {

        $ionicPlatform.ready(function () {
            setTimeout(function () {
                if (navigator && navigator.splashscreen) {
                    navigator.splashscreen.hide();
                }
            }, 100);
        });

        //on state change start
        $rootScope.$on('$stateChangeStart', function (event, toState) {

            //if try move to 'login' and the player is logged in - move to dashboard
            if (toState.name === 'login' && $myPlayer.isLoggedIn()) {
                event.preventDefault();
                $state.go('dashboard');
            }

            //if not logged in, but try move to login or register - force move to login.
            if (!$myPlayer.isLoggedIn() && toState.name !== 'login' && toState.name !== 'register') {
                event.preventDefault();
                $state.go('login');
            }
        });
    })

    .config(function ($stateProvider, $urlRouterProvider) {

        $stateProvider

            .state('login', {
                url: '/login',
                templateUrl: 'pages/login-page/login-page.html',
                controller: 'LoginCtrl'
            })

            .state('register', {
                url: '/register',
                templateUrl: 'pages/register-page/register-page.html',
                controller: 'RegisterCtrl'
            })

            .state('rooms', {
                cache: false,
                url: '/rooms?{reloadRooms}',
                templateUrl: 'pages/rooms-page/rooms-page.html',
                controller: 'RoomsCtrl'
            })

            .state('dashboard', {
                cache: false,
                url: '/',
                templateUrl: 'pages/dashboard-page/dashboard-page.html',
                controller: 'DashboardCtrl as vm',
                resolve: {
                    dashboardPlayer: function ($myPlayer, requestHandler, $log, $state, alertPopup) {
                        return new Promise(function (resolve, reject) {
                            requestHandler.createRequest({
                                event: 'getUser',
                                params: {
                                    userId: $myPlayer.getPlayer().id
                                },
                                onSuccess: function (user) {
                                    resolve(user);
                                },
                                onError: function (error) {
                                    $log.error("failed to get user", error);

                                    //if failed to get user - logout and move to login
                                    $myPlayer.logout();

                                    $state.go('login');

                                    alertPopup();

                                    reject("failed to get user");
                                }
                            });
                        });
                    }
                }
            })

            .state('scores', {
                cache: false,
                url: '/scores',
                templateUrl: 'pages/scores-page/scores-page.html',
                controller: 'ScoresCtrl as vm',
                resolve: {
                    topUsers: function (requestHandler, $log, $state, alertPopup) {
                        return new Promise(function (resolve, reject) {
                            requestHandler.createRequest({
                                event: 'getScores',
                                params: {},
                                onSuccess: function (users) {
                                    resolve(users);
                                },
                                onError: function (error) {
                                    $log.error("failed to get top scorers", error);

                                    //on error - move to dashboard
                                    $state.go('dashboard');

                                    alertPopup();

                                    reject("failed to get top scores");
                                }
                            });
                        });
                    }
                }
            })

            .state('rules', {
                url: '/rules',
                templateUrl: 'pages/rules-page/rules-page.html',
                controller: 'RulesCtrl as vm'
            })

            .state('create-room', {
                url: '/create-room',
                templateUrl: 'pages/rooms-page/create-room-page.html',
                controller: 'CreateRoomCtrl'
            })

            .state('game', {
                cache: false,
                url: '/game/?{roomId}{roomName}',
                templateUrl: 'pages/game-page/game-page.html',
                controller: 'GameCtrl as vm'
            });

        // if none of the above states are matched, use this as the fallback
        $urlRouterProvider.otherwise('/login');

    })
;
