// Peers
const {SchemaDirectiveVisitor} = require('graphql-tools');
const {GraphQLNonNull, DirectiveLocation, GraphQLDirective, GraphQLEnumType} = require("graphql");
const {
  AuthenticationError,
  AuthorizationError,
} = require('apollo-server-express');
// Deps
const jwt = require('jsonwebtoken');
var jwksClient = require('jwks-rsa');

const atob = str => {
  return Buffer.from(str, 'base64').toString('binary');
};

class hasRoleDirective extends SchemaDirectiveVisitor {
  public static getDirectiveDeclaration(
    directiveName: string,
    schema: GraphQLSchema,
  ): GraphQLDirective {
    const previousDirective = schema.getDirective(directiveName);
    if (previousDirective) {
      // If a previous directive declaration exists in the schema, it may be
      // better to modify it than to return a new GraphQLDirective object.
      previousDirective.args.forEach(arg => {
        if (arg.name === 'requires') {
          // Lower the default minimum Role from ADMIN to REVIEWER.
          arg.defaultValue = 'REVIEWER';
        }
      });

      return previousDirective;
    }

    // If a previous directive with this name was not found in the schema,
    // there are several options:
    //
    // 1. Construct a new GraphQLDirective (see below).
    // 2. Throw an exception to force the client to declare the directive.
    // 3. Return null, and forget about declaring this directive.
    //
    // All three are valid options, since the visitor will still work without
    // any declared directives. In fact, unless you're publishing a directive
    // implementation for public consumption, you can probably just ignore
    // getDirectiveDeclaration altogether.

    return new GraphQLDirective({
      name: directiveName,
      locations: [
        DirectiveLocation.OBJECT,
        DirectiveLocation.FIELD_DEFINITION,
      ],
      args: {
        requires: {
          // Having the schema available here is important for obtaining
          // references to existing type objects, such as the Role enum.
          type: (schema.getType('Role') as GraphQLEnumType),
          // Set the default minimum Role to REVIEWER.
          defaultValue: 'REVIEWER',
        }
      }]
    });
  }

  visitFieldDefinition(field) {
    const requiredRoles = this.args.oneOf;
    const resolver =
      field.resolve ||
      (source => {
        const value = source[field.name];
        return value;
      });
    const {url} = this.args;

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

    if (field.type instanceof GraphQLNonNull) {
      field.type = field.type.ofType;
    }
  }
}

class isAuthenticatedDirective extends SchemaDirectiveVisitor {
  public static getDirectiveDeclaration(
    directiveName: string,
    schema: GraphQLSchema,
  ): GraphQLDirective {
    const previousDirective = schema.getDirective(directiveName);
    if (previousDirective) {
      // If a previous directive declaration exists in the schema, it may be
      // better to modify it than to return a new GraphQLDirective object.
      previousDirective.args.forEach(arg => {
        if (arg.name === 'requires') {
          // Lower the default minimum Role from ADMIN to REVIEWER.
          arg.defaultValue = 'REVIEWER';
        }
      });

      return previousDirective;
    }

    // If a previous directive with this name was not found in the schema,
    // there are several options:
    //
    // 1. Construct a new GraphQLDirective (see below).
    // 2. Throw an exception to force the client to declare the directive.
    // 3. Return null, and forget about declaring this directive.
    //
    // All three are valid options, since the visitor will still work without
    // any declared directives. In fact, unless you're publishing a directive
    // implementation for public consumption, you can probably just ignore
    // getDirectiveDeclaration altogether.

    return new GraphQLDirective({
      name: directiveName,
      locations: [
        DirectiveLocation.OBJECT,
        DirectiveLocation.FIELD_DEFINITION,
      ],
      args: {
        requires: {
          // Having the schema available here is important for obtaining
          // references to existing type objects, such as the Role enum.
          type: (schema.getType('Role') as GraphQLEnumType),
          // Set the default minimum Role to REVIEWER.
          defaultValue: 'REVIEWER',
        }
      }]
    });
  }

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

    if (field.type instanceof GraphQLNonNull) {
      field.type = field.type.ofType;
    }
  }
}

const extractBearerToken = req => {
  const authorization =
    req.headers.authorization || req.headers.authentication || '';
  const token = (authorization.match(/[bB]earer (.+)$/) || [])[1];

  return token;
};

const makeOneGraphJwtVerifier = (appId, options) => {
  const {sharedSecret, strictSsl} = options || {};
  const origin = options.oneGraphOrigin || 'serve.onegraph.com';

  const handler = token => {
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

      verifier(token, function(err, decoded) {
        resolve(decoded);
      });
    });

    return promise;
  };

  return handler;
};

module.exports = {
  extractBearerToken: extractBearerToken,
  isAuthenticatedDirective: isAuthenticatedDirective,
  hasRoleDirective: hasRoleDirective,
  makeOneGraphJwtVerifier,
};
