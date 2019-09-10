// Peers
const {SchemaDirectiveVisitor} = require('graphql-tools');
const {AuthenticationError} = require('apollo-server-errors');
// Deps
const jwt = require('jsonwebtoken');
var jwksClient = require('jwks-rsa');

const atob = str => {
  return Buffer.from(str, 'base64').toString('binary');
};

const uuidRegex = /[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}/g;

const isUuid = string => {
  const matches = (string || '').match(uuidRegex);
  return (matches || []).length === 1;
};

class hasRole extends SchemaDirectiveVisitor {
  visitFieldDefinition(field) {
    const resolver =
      field.resolve ||
      (source => {
        const value = source[field.name];
        return value;
      });
    const {url} = this.args;

    const requiredRoles = this.args.oneOf;
    field.resolve = (source, args, context, info) => {
      const userRoles =
        (context.jwt && context.jwt.user && context.jwt.user.roles) || [];
      const roleRequirementSatisfied = userRoles.some(role =>
        requiredRoles.includes(role),
      );

      if (!roleRequirementSatisfied) {
        throw new AuthenticationError(
          `Roles required to access ${field.name}: oneOf=[${requiredRoles.join(
            ', ',
          )}], roles you have=[${userRoles.join(', ')}]`,
        );
      }

      return resolver(source, args, context, info);
    };
  }
}

class isAuthenticated extends SchemaDirectiveVisitor {
  visitFieldDefinition(field) {
    const resolver =
      field.resolve ||
      (source => {
        const value = source[field.name];
        return value;
      });
    const {url} = this.args;

    field.resolve = (source, args, context, info) => {
      const userId = context.jwt && context.jwt.user && context.jwt.user.id;

      if (!userId) {
        throw new AuthenticationError(
          `You must authenticate to access ${field.name}`,
        );
      }

      return resolver(source, args, context, info);
    };
  }
}

const extractBearerToken = req => {
  const authorization =
    req.headers.authorization || req.headers.authentication || '';
  const token = (authorization.match(/[bB]earer (.+)$/) || [])[1];

  return token;
};

const makeOneGraphJwtVerifier = (appId, options_) => {
  const options = options_ || {};

  if (!isUuid(appId)) {
    console.error('OneGraph APP_ID must be a UUID, you provided: ', appId);
    console.error(
      '\tCheck that you have the right APP_ID from the OneGraph dashboard: https://www.onegraph.com/dashboard',
    );
  }

  const {sharedSecret, strictSsl} = options;
  const origin = options.oneGraphOrigin || 'serve.onegraph.com';

  const verifyJwt = token => {
    const promise = new Promise((resolve, reject) => {
      if (!token) return resolve({jwt: null});

      let header = token.split('.')[0];

      try {
        header = JSON.parse(atob(header));
      } catch (e) {
        reject('Error decoding JWT, header is invalid: ' + header + e);
      }

      let verifier;

      const alg =
        sharedSecret &&
        header &&
        header.alg &&
        ['HS256', 'HS512'].includes(header.alg)
          ? 'HMAC'
          : 'RSA';

      if (alg === 'HMAC' && !sharedSecret) {
        reject(
          "HMAC key used when apollo-server configured to use RSA. Did you forget to include your `sharedSecret' when creating the OneGraphJWT client? JWT Header: " +
            JSON.stringify(header),
        );
      }

      if (alg === 'HMAC') {
        verifier = (token, cb) => {
          jwt.verify(token, sharedSecret, {algorithms: ['HS256']}, cb);
        };
      } else {
        var client = jwksClient({
          strictSsl,
          jwksUri: `https://${origin}/app/${appId}/.well-known/jwks.json`,
        });

        function getKey(header, callback) {
          client.getSigningKey(header.kid, function(err, key) {
            var signingKey =
              (key && key.publicKey) || (key && key.rsaPublicKey);
            if (key) {
              callback(null, signingKey);
            } else {
              reject(
                'No publicKey or rsaPublicKey found on signingKey for JWT in header: ' +
                  JSON.stringify(header),
              );
            }
          });
        }

        verifier = (token, cb) =>
          jwt.verify(token, getKey, {algorithms: ['RS256']}, cb);
      }

      return verifier(token, function(err, decoded) {
        resolve(decoded);
      });
    });

    return promise;
  };

  const jwtFromHeaders = headers => {
    const promise = new Promise((resolve, reject) => {
      const authorization =
        headers['Authorization'] ||
        headers['authorization'] ||
        headers['Authentication'] ||
        headers['authentication'];

      const token = (authorization.match(/[bB]earer (.+)$/) || [])[1];

      if (!token) {
        resolve({jwt: null});
      }

      try {
        const decoded = verifyJwt(token)
          .then(decoded => {
            resolve({jwt: decoded});
          })
          .catch(rejection => {
            console.warn(`JWT present, but verification failed: `, rejection);
            resolve({jwt: null});
          });
      } catch (rejection) {}
    });

    return promise;
  };

  return jwtFromHeaders;
};

module.exports = {
  extractBearerToken: extractBearerToken,
  isAuthenticated: isAuthenticated,
  hasRole: hasRole,
  makeOneGraphJwtVerifier,
};
