angular.module('osApp.user', [])
  .service('User', function($http, $q, $cookies, UserToken, TenantTokens) {
    return {
      signIn: signIn,
      signOut: signOut
    };

    function signIn(userName, password) {
      var data = {
        "auth": {
          "passwordCredentials": {
            "username": userName,
            "password": password
          }
        }
      };

      signOut();

      return $http.post('http://192.168.122.183:5000/v2.0/tokens', data)
        .then(function(response) {
          UserToken.set(response.data.access.token.id,
                        response.data.access.token.expires);
          UserToken.get();
          set(response.data);
        }, function(response) {
          return $q.reject(new Error('Error signing in'));
        });
    };

    function signOut() {
      UserToken.remove();
      TenantTokens.remove();
      remove();
    }

    function set(data) {
      var user = angular.copy(data.access.user);
      var expires = moment(data.access.token.expires)
                      .add(1, 'hour').toISOString();

      user.responseData = data;
      $cookies.putObject('User', user, { expires: expires });
    }

    function remove() {
      $cookies.remove('User');
    }
  });
