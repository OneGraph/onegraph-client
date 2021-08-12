## OneGraph Auth

The main helper library for automating all-things and/or authorization in the browser. Many services are supported for logging in/out of applications, and more details about the library can be found on [the OneGraph docs site](https://www.onegraph.com/docs/logging_users_in_and_out.html).

## Installation

Add the onegraph-auth library to your app:

```sh
npm install onegraph-auth --save
```

## Create an Auth Client

For our example, we'll log in to Stripe.

First, we'll construct a new OneGraphAuth instance. It requires the
name of the service and an appId.

```javascript
import OneGraphAuth from 'onegraph-auth';

const APP_ID = YOUR_APP_ID;

const auth = new OneGraphAuth({
  appId: APP_ID,
});
```

The OneGraphAuth client has 3 methods, `isLoggedIn`, `login`, `logout`.

## Check if the user is loggedIn

The `isLoggedIn` method takes a service name as its only argument and
will return a promise with a boolean indicating if the user is logged
in to that service.

```javascript
auth.isLoggedIn('github').then((isLoggedIn) => {
  if (isLoggedIn) {
    console.log('Already logged in to GitHub');
  } else {
    console.log('Not logged in to GitHub.');
  }
});
```

## Log the user in

The `login` method takes a service name as its only argument and will
take the client through the OAuth login flow for the service and
return a promise that resolves after the client finishes the flow.

After the client finishes, you can call `isLoggedIn` again to check if the
user successfully made it through the flow.

```javascript
auth
  .login('github')
  .then(() => {
    auth.isLoggedIn('github').then((isLoggedIn) => {
      if (isLoggedIn) {
        console.log('Successfully logged in to GitHub');
      } else {
        console.log('Did not grant auth for GitHub');
      }
    });
  })
  .catch((e) => console.error('Problem logging in', e));
```

## Log the user out

The `logout` method takes a service name as its only argument and will
log the client out and return a promise wrapping an object with a
`result` key whose value is either 'success' or 'failure' to indicate
whether the user is still logged in.

```javascript
auth.logout('github').then((response) => {
  if (response.result === 'success') {
    console.log('Logout succeeded');
  } else {
    console.log('Logout failed');
  }
});
```

## Use OneGraphAuth with Apollo

OneGraphAuth maintains an OAuth token that authenticates you with
OneGraph. We need to tell Apollo how to send that token to OneGraph in
the `Authentication` header.

We'll set up our Apollo client to use the token:

```jsx
import ApolloClient from 'apollo-boost';
import OneGraphAuth from 'onegraph-auth';

const APP_ID = YOUR_APP_ID;

const auth = new OneGraphAuth({
  appId: APP_ID,
});

const client = new ApolloClient({
  uri: 'https://serve.onegraph.com/graphql?app_id=' + APP_ID,
  request: (operation) => operation.setContext({headers: auth.authHeaders()}),
});
```

In the example, we added a request handler that will run every time
Apollo sends a new request to OneGraph. The token could change as the
user signs in and out of new services, so we should always send the
newest token.

OneGraph also provides its own Apollo client that will handle this for you.

First install the client:

```sh
npm install onegraph-apollo-client --save
```

Then use the client in place of ApolloClient in your app:

```javascript
import OneGraphApolloClient from 'onegraph-apollo-client';
import OneGraphAuth from 'onegraph-auth';

const APP_ID = YOUR_APP_ID;

const auth = new OneGraphAuth({
  appId: APP_ID,
});

const client = new OneGraphApolloClient({
  oneGraphAuth: auth,
});
```
