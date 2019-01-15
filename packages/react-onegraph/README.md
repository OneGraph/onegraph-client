> The repository was [moved to the official OneGraph organisation](https://github.com/OneGraph/onegraph-client/tree/master/packages/react-onegraph).

# React Bindings for OneGraph's Authentication Client

Useful React components for working with [OneGraph](http://onegraph.com/) and React.<br>
It wraps the [OneGraphAuth](https://www.onegraph.com/docs/logging_users_in_and_out.html) API automatically rerendering on Authentication changes.

<img alt="npm downloads" src="https://img.shields.io/npm/dm/react-onegraph.svg"> <img alt="gzipped size" src="https://img.shields.io/bundlephobia/minzip/react-onegraph.svg?colorB=4c1&label=gzipped%20size"> <img alt="npm version" src="https://badge.fury.io/js/react-onegraph.svg">


## Installation
> **Note**: react-onegraph requires **react@^16.3.0** to be installed as a peerDependency.

```sh
# yarn
yarn add react-onegraph

# npm
npm i --save react-onegraph
```

## Usage

The package exports 3 parts: **AuthProvider**, **AuthConsumer** and **AuthContext**.

----

To get started, we have to wrap our application with an **AuthProvider**. It manages an instance of [OneGraphAuth](https://www.onegraph.com/docs/logging_users_in_and_out.html) client and passes relevant data using the React Context API.

It takes only the OneGraph *appId* as props.

```javascript
import { AuthProvider } from 'react-onegraph'

const APP_ID = /* OneGraph appId */

ReactDOM.render(
  <AuthProvider appId={APP_ID}>
    <App />
  </AuthProvider>,
  document.body
)
```

Now one can use the **AuthConsumer** to get a status per service, request headers and login/logout methods.
It implements the render props pattern and automatically updates and rerenders the status and headers on login/logout calls.

#### Render Props

| Property | Type | Description |
| ----- | --- | ---- |
| appId | *(string)* | The OneGraph *appId* that was passed to the AuthProvider |
| status | *(Object)*  | A map of service-status pairs |
| headers |*(Object)*  |  The authentication headers object that is used for API requests |
| login | *(Function)* |  A function that accepts a service name and an optional status callback |
| logout | *(Function)* |  A function that accepts a service name and an optional status callbac |

```javascript
import { AuthConsumer } from 'react-onegraph'

const YouTubeAuthentication = (
  <AuthConsumer>
    {({ status, login, logout }) => {
      if (status.youtube) {
        return (
          <div>
            You are logged in!
            <button onClick={() => logout("youtube")}>Logout</button>
          <div>
        )
      }

      return (
        <button onClick={() => login("youtube")}>
          Login
        </button>
      )
    }}
  </AuthConsumer>
)
```

### Callbacks
The login and logout function take an optional second callback parameter.<br>
It receives the authentication status for the requested service and is invokes as soon as the login request is resolved.

```javascript
import { AuthConsumer } from 'react-onegraph'

const YouTubeAuthentication = (
  <AuthConsumer>
    {({ login }) => {
      const loginYoutube = () => login('youtube', () => console.log("Logged in!"))

      return (
        <button onClick={loginYoutube}>
          Login
        </button>
      )
    )}
  </AuthConsumer>
)
```

### Passing the headers
In order to query service data that requires authentication, we need to pass the auth headers to the request.<br>

#### Apollo
If you're using [Apollo](http://apollographql.com) there are basically two options to pass the headers. You can either wrap the **AuthConsumer** around your [ApolloProvider](https://www.apollographql.com/docs/react/api/react-apollo.html#ApolloProvider) and pass the apiId and headers once to the [ApolloClient](https://www.apollographql.com/docs/react/api/apollo-client.html) which is passed to the [ApolloProvider](https://www.apollographql.com/docs/react/api/react-apollo.html#ApolloProvider).

Another option would be to pass the headers to each [Query](https://www.apollographql.com/docs/react/essentials/queries.html) component separately.

```javascript
import { AuthConsumer } from 'react-onegraph'
import { Query } from 'react-apollo'

const ONEGRAPH_QUERY = /* onegraph gql query */

const OneGraphQuery = (
  <AuthConsumer>
    {({ headers }) => (
      <Query 
        query={ONEGRAPH_QUERY}
        context={{ headers }}>
        {({ loading, error, data }) =>  /* render something */}
      </Query>
    )}
  </AuthConsumer>
)
```

## useContext hook
> **Note**: Using hooks requires react @16.7.0-alpha.1 or @16.7.0-alpha.2

```javascript
import { useContext } from 'react'
import { AuthContext } from 'react-onegraph'

const OneGraphWithHooks = {
  const { status, login, logout, headers, appId } = useContext(AuthContext)

  return (
    // render something
  )
}
```


## License
react-onegraph is licensed under the [MIT License](http://opensource.org/licenses/MIT).<br>
Documentation is licensed under [Creative Common License](http://creativecommons.org/licenses/by/4.0/).<br>
Created with ♥ by [@rofrischmann](http://rofrischmann.de) and all the great contributors.
