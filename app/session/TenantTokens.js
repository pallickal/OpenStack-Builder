angular.module('osApp.user')
  .service('TenantTokens', function($interval, $http, $cookies, $q, $injector,
    UserToken) {
    return {
      cached: cached,
      setDirty: setDirty,
      renewDirty: renewDirty,
      renew: renew,
      remove: remove
    };

    function cached(tenantId) {
      var tenantTokens = $cookies.getObject('Tenant-Tokens');
      var tenantToken;

      if (tenantTokens) tenantToken = tenantTokens[tenantId];

      return tenantToken;
    }

    function setDirty(tenantId) {
      var token = cached(tenantId);
      token.dirty = true;
      set(tenantId, token.id, token.expiresAt, token.dirty);
    };

    function renewDirty() {
      var tokens = $cookies.getObject('Tenant-Tokens');

      for (tenantId in tokens) {
        if (tokens[tenantId].dirty) {
          renew(tenantId)
            .catch(function(error) {
              console.log(error.stack);
            });
        }
      }
    }

    function renew(tenantId) {
      var Session = $injector.get('Session');

      return Session.userToken()
        .then(function(userToken) {
          var data = {
            "auth": {
              "token": {
                "id": userToken.id
              },
              "tenantId": tenantId
            }
          };

          return $http.post('http://192.168.122.183:35357/v2.0/tokens', data)
            .then(
              function(response) {
                set(tenantId, response.data.access.token.id, response.data.access.token.expires);
                return cached(tenantId);
              },
              function(response) {
                return $q.reject(new Error('Error getting tenant token for id ' + tenantId));
              }
            );
        });
    }

    function remove() {
      $cookies.remove('Tenant-Tokens');
    }

    function set(tenantId, tenantToken, expiresAt, dirty) {
      tenantTokens = $cookies.getObject('Tenant-Tokens') || {};
      token = {
        'id': tenantToken,
        'dirty': (dirty ? true : false),
        'expiresAt': expiresAt,
        'storedAt': moment().toISOString()
      };
      tenantTokens[tenantId] = token;
      $cookies.putObject('Tenant-Tokens', tenantTokens, {expires: token.expiresAt});
    }
  });
