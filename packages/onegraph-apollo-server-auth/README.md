## OneGraph Auth for Apollo Server

You can use AuthGuardian by OneGraph to handle all of your authentication and permission needs in your Apollo server.

### At a glance
AuthGuardian lets you configure sophisticated rules that will run every time a user logs in to any service (GitHub, Salesforce, Quickbooks, etc.) via OneGraph and will produce a JWT that contains everything you need to know *who* a user is and *what* they're allowed to do in your API.

Each rule consists of two parts: conditions and effects.

An example of a rule condition might be,

> "When this user is a member of organization X on GitHub AND this user has made at least one commit to the repository repo-owner/repo-name".

OneGraph knows how to query each of the services to find out if the condition has been met automatically!

When all of the conditions for a rule are met, the effects are run. An effect might be:

> Set the `user.id` to the user's GitHub user-id, and add "admin" to the list of `user.roles`

So the full rule would read:

> "When this user is a member of organization X on GitHub AND this user has made at least one commit to the repository repo-owner/repo-name".
> Then set the `user.id` to the user's GitHub user-id AND add "admin" to the list of `user.roles` AND add a Netlify role of "developer"

If this rule passed after a user logged in via GitHub, OneGraph would generate a full, signed JWT for use in your GraphQL resolvers:

```
{
  "iss": "OneGraph",
  "aud": "https://serve.onegraph.com/dashboard/app/00000000-0000-0000-0000-000000000000",
  "iat": 1566594200,
  "exp": 1566680600,
  "user": {
    "id": 35296,
    "roles": [
      "admin"
    ]
  },
  "app_metadata": {
    "authorization": {
      "roles": [
        "developer"
      ]
    }
  }
}
```

### Using the OneGraph JWT in Apollo Server
1. First, install the auth package:

```
npm install --save onegraph-apollo-server-auth
# or 
yarn add onegraph-apollo-server-auth
```

2. Use the custom directives
There are two customer directives implemented by `onegraph-apollo-server-auth`, `@isAuthencated` and `@hasRoles`:

```
directive @isAuthenticated on QUERY | FIELD_DEFINITION
directive @hasRole(oneOf: [String!]) on QUERY | FIELD_DEFINITION
```

#### @isAuthenticated
Any field that has this directive added to is will always check in the JWT that a value is present at `user.id`. If not, the user has not authenticated (that is, has not logged into any service), and the field will return null, and an error message will be added to the response.

```
type Query {
  companies : [Company] @isAuthenticated
}
```

#### @hasRole
Any field with this directive added will check in the JWT at the path `user.roles` to make sure that the user has been granted a role that's required to view this field.

```
type Company {
  id: String!
  name: String @hasRole(oneOf: ["visitor"])
  accountBalance: Int! @hasRole(oneOf: ["admin"])
}
```

In this case, any user will be able to query for Company `id`s, but the AuthGuardian rules must have granted this user the `visitor` role to view the Company `name`, and the `admin` role to view the Company `accountBalance`.

And that's it! With just a few bits of annotation to your schema and a few minutes to configure the AuthGuardian rules, your entire authentication and permissions system can be taken care of securely!

### Logging in your users via the OneGraph Auth Client
See the instructions on how to quickly get your users logging in via [Onegraph Auth](https://www.onegraph.com/docs/logging_users_in_and_out.html). Here's a rough summary:

Install the `onegraph-auth` package on your client:

```
npm install --save onegraph-auth
# or
yarn add onegraph-auth
```

Instantiate the auth client in the browser (with the same `APP_ID` you used to configure AuthGuardian):

```
import OneGraphAuth from 'onegraph-auth';

const APP_ID = YOUR_APP_ID;

const auth = new OneGraphAuth({
  appId: APP_ID,
});
```

And log in your user (in this case via `github`):

```
auth
  .login('github')
  .then(() => {
    auth.isLoggedIn('github').then(isLoggedIn => {
      if (isLoggedIn) {
        console.log('Successfully logged in to GitHub');
      } else {
        console.log('Did not grant auth for GitHub');
      }
    });
  })
  .catch(e => console.error('Problem logging in', e));
```

That's it! At the end of that flow, all of your AuthGuardian rules will have run, and the user will have a JWT that reflects their authentication and permissions for your API!
