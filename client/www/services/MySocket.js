/**
 * Created by Yair on 2/20/2017.
 */

angular.module('MyCubes.services.my-socket', [])

    .factory('mySocket', function (socketFactory, $log) {

        var mySocket = {};

        var ENVIRONMENTS = {
            LOCAL: {
                host: 'localhost:80'
            },
            TEAMMATE: {
                host: '192.168.1.108:80'
            },
            TEAMMATE2: {
                host: '192.168.43.233:80'
            },
            PRODUCTION: {
                host: '35.158.239.64:80'
            }
        };

        var selectedEnvironment = ENVIRONMENTS.PRODUCTION;//

        $log.debug("environment host selected = ", selectedEnvironment.host);

        mySocket = socketFactory({
            ioSocket: io.connect(selectedEnvironment.host)
        });

        return {
            getSocket: function () {
                return mySocket;
            }
        };
    });
