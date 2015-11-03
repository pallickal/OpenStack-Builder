angular.module('tenantTokens', ['token'])
  .service('tenantTokensService', function($interval, $http, $cookies, tokenService) {
    return {
      get: get,
      setDirty: setDirty,
      renew: renew
    };

    function get(tenant_id) {
      console.log(
        'tenantTokensService:get - |' + tenant_id + '| = ' +
        JSON.stringify($cookies.getObject(tenant_id), null, '  ')
      );
      return $cookies.getObject(tenant_id);
    }

    function setDirty(tenant_id) {
      console.log('tenantTokensService:setDirty - setting tenant ' + tenant_id + ' token dirty');
      var token = get(tenant_id);
      token.dirty = true;
      set(tenant_id, token);
    };

    function renew(subject_token_id, tenant_id, deferred) {
      var requestData = {
        "auth": {
          "token": {
            "id": subject_token_id
          },
          "tenantId": tenant_id
        }
      };
      console.log('tenantTokensService:renew - Request data\n' + JSON.stringify(requestData, null, '  '));

      $http.post('http://192.168.122.183:35357/v2.0/tokens', requestData)
        .then(
          function(response) {
            console.log('tenantTokensService:renew - Response:\n' + JSON.stringify(response, null, '  '));
            persist(tenant_id, response.data);
            $http.defaults.headers.common['X-Auth-Token'] = response.data.access.token.id;
            if (deferred) deferred.resolve(response.data.access.token.id);
          },
          function(response) {
            console.log('tenantTokensService:renew - Could not get tenant scoped token');
            if (deferred) deferred.reject('tenantTokensService:renew - Could not get tenant scoped token');
          }
        );
    }

    function persist(tenant_id, data) {
      token = {
        'id': data.access.token.id,
        'dirty': false,
        'expires_at': data.access.token.expires,
        'stored_at': moment().toISOString()
      };
      set(tenant_id, token);
    }

    function set(tenant_id, token) {
      $cookies.putObject(tenant_id, token, {expires: token.expires_at});
    }
  });