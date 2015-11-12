angular.module('session', ['user', 'token', 'tenantTokens', 'tokensPolling', 'ui.router.util'])
  .service('sessionService', function($q, userService, userTokenService, tenantTokensService) {
    return {
      withUserToken: withUserToken,
      withTenantToken: withTenantToken
    };

    function withUserToken() {
      return withToken(userTokenService);
    }

    function withTenantToken(tenantId) {
      return withToken(tenantTokensService, tenantId);
    }

    function withToken(tokenService, subjectId) {
      var token = tokenService.get(subjectId);

      if (token) {
        var minTillExpiration = moment(token.expiresAt).diff(moment(), 'minutes');
        var secSinceStored = moment().diff(moment(token.storedAt), 'seconds');

        if (secSinceStored < 7) {
          return $q.resolve(token);
        } else if (minTillExpiration <= 2) {
          return tokenService.renew(subjectId);
        } else {
          tokenService.setDirty(subjectId);
          return $q.resolve(token);
        }
      } else {
        return tokenService.renew(subjectId);
      }
    }
  });
