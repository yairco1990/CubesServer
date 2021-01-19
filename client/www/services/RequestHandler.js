/**
 * Created by Yair on 2/20/2017.
 */

angular.module('MyCubes.services.request-handler', [])


    .factory('requestHandler', ['mySocket',
        function (mySocket) {
            return {
                createRequest: function (request) {
                    mySocket.getSocket().emit(request.event, request.params,
                        function (data) {

                            if (data.response == "success") {

                                request.onSuccess && request.onSuccess(data.result);
                            } else {

                                request.onError && request.onError(data.result);
                            }

                            request.onFinally && request.onFinally(data);
                        }
                    )
                    ;
                }
            }
        }])
;

