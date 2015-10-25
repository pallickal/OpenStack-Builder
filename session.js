angular.module('session', [])
  .factory('sessionFactory', function($http, $cookies, $cacheFactory, $window) {
    return {
      authenticate: authenticate,
      withToken: withToken,
      withTenantToken: withTenantToken
    };

    ////////

    function persistToken(x_subject_token, expires_at) {
      var token = $cookies.getObject('X-Subject-Token') || {};

      token = {
        'id': x_subject_token,
        'expires_at': expires_at,
        'stored_at': moment().toISOString()
      };

      $cookies.putObject('X-Subject-Token', token, {expires: expires_at});
      console.log(
        "sessionFactory:persistToken - |X-Subject-Token| = " +
        JSON.stringify($cookies.getObject('X-Subject-Token'), null, '  ')
      );
    }

    function authenticate(userName, password, callback) {
      var requestData = {
                        "auth": {
                          "identity": {
                            "methods": [
                              "password"
                            ],
                            "password": {
                              "user": {
                                "domain": {
                                  "name": "default"
                                },
                                "name": userName,
                                "password": password
                              }
                            }
                          }
                        }
                      };

      console.log('sessionFactory:authenticate - requestData:\n' + JSON.stringify(requestData, null, '  '));

      $http.post('http://192.168.122.183:35357/v3/auth/tokens', requestData)
        .success(function(response, status, headers) {
          console.log('sessionFactory:authenticate - Token response header:\n' + JSON.stringify(headers(), null, '  '));
          console.log('sessionFactory:authenticate - Token response:\n' + JSON.stringify(response, null, '  '));

          persistToken(headers('X-Subject-Token'), response.token.expires_at);
          $http.defaults.headers.common['X-Auth-Token'] = headers('X-Subject-Token');
          callback();
        }); <!-- add failure handling -->
    };

    function withToken(callback) {
      var token = $cookies.getObject('X-Subject-Token');

      console.log(
        "sessionFactory:withToken - |X-Subject-Token| = " +
        JSON.stringify($cookies.getObject('X-Subject-Token'), null, '  ')
      );

      function refreshToken() {
        var requestData = {
          "auth": {
            "token": {
              "id": token.id
            }
          }
        };

        $http.defaults.headers.common['X-Auth-Token'] = token.id;
        $http.post('http://192.168.122.183:35357/v2.0/tokens', requestData)
        .then(
          function(response, status, headers) {
            console.log('sessionFactory:withToken:refreshToken:postSuccess - Response:\n' + JSON.stringify(response, null, '  '));
            persistToken(response.data.access.token.id, response.data.access.token.expires);
            callback(response.data.access.token.id);
          },
          function(response) {
            console.log('sessionFactory:withToken:refreshToken:postError - Response:\n' + response);
            $window.location.href = '#/login';
          }
        );  // redirect to sign in on failure
      }

      if (token) {
        var min_till_exp = moment(token.expires_at).diff(moment(), 'minutes');
        var sec_since_stored = moment().diff(moment(token.stored_at), 'seconds');

        console.log(
          'sessionFactory:withToken - current date/time = ' +
          moment().toISOString()
        );
        console.log(
          'sessionFactory:withToken - expires_at = ' +
          moment(token.expires_at).toISOString()
        );
        console.log(
          'sessionFactory:withToken - expires_at minutes from current date/time = ' +
          min_till_exp
        );
        console.log(
          'sessionFactory:withToken - stored_at = ' +
          moment(token.stored_at).toISOString()
        );
        console.log(
          'sessionFactory:withToken - stored_at seconds from current date/time = ' +
          sec_since_stored
        );

        if (min_till_exp <= 0) {
          console.log('sessionFactory:withToken - Warning! Token expired and still held as cookie');
          $window.location.href = '#/login';
        } else if (sec_since_stored < 7) {
          console.log('sessionFactory:withToken - Skipping refresh. < 7 seconds elapsed.');
          $http.defaults.headers.common['X-Auth-Token'] = token.id;
          callback(token.id);
        } else if (min_till_exp > 2) {
          console.log('sessionFactory:withToken - Delaying refresh. > 2 minutes till expiration.');
          $http.defaults.headers.common['X-Auth-Token'] = token.id;
          callback(token.id);
          callback = function() {};
          refreshToken();
        } else {  // renew token with existing token
          console.log('sessionFactory:withToken - < 2 minutes till expiration. Refresh first.');
          refreshToken();
        }

      } else {
        console.log('sessionFactory:withToken - Token never existed or expired');
        $window.location.href = '#/login';
      }
    }

    function withTenantToken(tenant_id, callback) {
      withToken(function(token_id) {
        var token = $cookies.getObject(tenant_id) || {};

        console.log(
          'sessionFactory:withTenantToken - |' + tenant_id + '| = ' +
          JSON.stringify($cookies.getObject(tenant_id), null, '  ')
        );

        function persistTenantToken(tenant_token, expires_at, stored_at) {
          token = {
            'id': tenant_token,
            'expires_at': expires_at,
            'stored_at': moment().toISOString()
          };

          $cookies.putObject(tenant_id, token, {expires: expires_at});
          console.log(
            'sessionFactory:withTenantToken:persistTenantToken - |' + tenant_id + '| = ' +
            JSON.stringify($cookies.getObject(tenant_id), null, '  ')
          );
        }

        function refreshTenantToken() {
          var requestData = {
            "auth": {
              "token": {
                "id": token_id
              },
              "tenantId": tenant_id
            }
          };
          console.log('sessionFactory:withTenantToken - Request data\n' + JSON.stringify(requestData, null, '  '));

          $http.defaults.headers.common['X-Auth-Token'] = token_id;
          $http.post('http://192.168.122.183:35357/v2.0/tokens', requestData)
            .then(
              function(response) {
                console.log('sessionFactory:withTenantToken - Response:\n' + JSON.stringify(response, null, '  '));
                persistTenantToken(response.data.access.token.id, response.data.access.token.expires);
                $http.defaults.headers.common['X-Auth-Token'] = response.data.access.token.id;
                callback(response.data.access.token.id);
              },
              function(response) {
                console.log('sessionFactory:withTenantToken - Could not get tenant scoped token');
              }
            );
          }

          if (token) {
            var min_till_exp = moment(token.expires_at).diff(moment(), 'minutes');
            var sec_since_stored = moment().diff(moment(token.stored_at), 'seconds');

            console.log(
              'sessionFactory:withTenantToken - expires_at minutes from current date/time = ' +
              min_till_exp
            );
            console.log(
              'sessionFactory:withTenantToken - min_till_exp seconds from current date/time = ' +
              sec_since_stored
            );

            if (min_till_exp > 0 && sec_since_stored < 7) {
              console.log('sessionFactory:withTenantToken - Skipping refresh. < 7 seconds elapsed.');
              $http.defaults.headers.common['X-Auth-Token'] = token.id;
              callback(token.id);
            } else if (min_till_exp > 2) {
              console.log('sessionFactory:withTenantToken - Delayed refresh. > 2 minutes till expiration.');
              $http.defaults.headers.common['X-Auth-Token'] = token.id;
              callback(token.id);
              callback = function() {};
              refreshTenantToken();
            } else {
              if (min_till_exp <= 0) {
                console.log('sessionFactory:withTenantToken - Warning! Tenant scoped token expired and still held as cookie');
              } else {
                console.log('sessionFactory:withTenantToken - < 2 minutes till expiration, refresh first.');
              }
              refreshTenantToken();
            }

          } else {
            console.log('sessionFactory:withToken - Token never existed or expired');
            refreshTenantToken();
          }

      });
    }

  })
  .controller('loginCtrl', function($scope, $http, $cookies, $window, sessionFactory){
    $scope.formData = { 'userName' : 'demo', 'password' : 'opstack' };

    console.log('loginCtrl: |X-Subject-Token| = ' + JSON.stringify($cookies.getObject('X-Subject-Token'), null, '  '));

    $scope.processFunction = function() {
      sessionFactory.authenticate($scope.formData.userName, $scope.formData.password, function() {
        $window.location.href = '#/tenants';
      });
    };
  });