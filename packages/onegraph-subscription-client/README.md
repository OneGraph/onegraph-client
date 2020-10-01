## OneGraph Subscriptions Transport over Websockets

This library is a light wrapper over [subscriptions-transport-ws](https://github.com/apollographql/subscriptions-transport-ws) that provides the required configuration to use subscriptions with OneGraph.

### Installation

With yarn:

```sh
yarn add onegraph-subscription-client
```

With npm:

```sh
npm install --save onegraph-subscription-client
```

### Usage

```javascript
import {SubscriptionClient} from 'onegraph-subscription-client';

const ONEGRAPH_APP_ID = 'YOUR_APP_ID';

const client = new SubscriptionClient(ONEGRAPH_APP_ID);

client
  .request({
    query: /* GraphQL */ `
      subscription NpmPackagesSubscription {
        npm {
          allPublishActivity {
            package {
              name
            }
          }
        }
      }
    `,
    operationName: 'NpmPackagesSubscription',
  })
  .subscribe(
    next => {
      const npmPackage = next.data.npm.allPublishActivity.package;
      console.log(npmPackage);
    },
    error => console.error(error),
    () => console.log('done'),
  );
```

#### With OneGraphAuth

```javascript
import {SubscriptionClient} from 'onegraph-subscription-client';
import {OneGraphAuth} from 'onegraph-auth';

const ONEGRAPH_APP_ID = 'YOUR_APP_ID';

const auth = new OneGraphAuth(ONEGRAPH_APP_ID);

const client = new SubscriptionClient(ONEGRAPH_APP_ID, {oneGraphAuth: auth});

```

#### With Apollo Client

```javascript
import {SubscriptionClient} from 'onegraph-subscription-client';
import {ApolloClient} from 'apollo-client';
import {InMemoryCache} from 'apollo-cache-inmemory';

const ONEGRAPH_APP_ID = 'YOUR_APP_ID';

const subscriptionClient = new SubscriptionClient(ONEGRAPH_APP_ID);

const apolloClient = new ApolloClient({
  link: subscriptionClient,
  cache: new InMemoryCache(),
});
```

# API Docs

## SubscriptionClient

### `Constructor(url, options, webSocketImpl)`

- `appId: string` : Your OneGraph AppId
- `options?: Object` : optional, object to modify default client behavior
  - `oneGraphAuth?: OneGraphAuth` : the OneGraphAuth instance that this subscription should use to authenticate requests
  - `timeout?: number` : how long the client should wait in ms for a keep-alive message from the server (default 30000 ms), this parameter is ignored if the server does not send keep-alive messages. This will also be used to calculate the max connection time per connect/reconnect
  - `lazy?: boolean` : use to set lazy mode - connects only when first subscription created, and delay the socket initialization
  - `reconnect?: boolean` : automatic reconnect in case of connection error
  - `reconnectionAttempts?: number` : how much reconnect attempts
  - `connectionCallback?: (error) => {}` : optional, callback that called after the first init message, with the error (if there is one)
  - `inactivityTimeout?: number` : how long the client should wait in ms, when there are no active subscriptions, before disconnecting from the server. Set to 0 to disable this behavior. (default 0)
- `webSocketImpl?: Object` - optional, constructor for W3C compliant WebSocket implementation. Use this when your environment does not have a built-in native WebSocket (for example, with NodeJS client)

### Methods

#### `request(options) => Observable<ExecutionResult>`: returns observable to execute the operation.

- `options: {OperationOptions}`
  - `query: string` : GraphQL subscription
  - `variables: Object` : GraphQL subscription variables
  - `operationName: string` : operation name of the subscription
  - `context: Object` : use to override context for a specific call

#### `unsubscribeAll() => void` - unsubscribes from all active subscriptions.

#### `on(eventName, callback, thisContext) => Function`

- `eventName: string`: the name of the event, available events are: `connecting`, `connected`, `reconnecting`, `reconnected`, `disconnected` and `error`
- `callback: Function`: function to be called when websocket connects and initialized.
- `thisContext: any`: `this` context to use when calling the callback function.
- => Returns an `off` method to cancel the event subscription.

#### `onConnected(callback, thisContext) => Function` - shorthand for `.on('connected', ...)`

- `callback: Function`: function to be called when websocket connects and initialized, after ACK message returned from the server
- `thisContext: any`: `this` context to use when calling the callback function.
- => Returns an `off` method to cancel the event subscription.

#### `onReconnected(callback, thisContext) => Function` - shorthand for `.on('reconnected', ...)`

- `callback: Function`: function to be called when websocket reconnects and initialized, after ACK message returned from the server
- `thisContext: any`: `this` context to use when calling the callback function.
- => Returns an `off` method to cancel the event subscription.

#### `onConnecting(callback, thisContext) => Function` - shorthand for `.on('connecting', ...)`

- `callback: Function`: function to be called when websocket starts it's connection
- `thisContext: any`: `this` context to use when calling the callback function.
- => Returns an `off` method to cancel the event subscription.

#### `onReconnecting(callback, thisContext) => Function` - shorthand for `.on('reconnecting', ...)`

- `callback: Function`: function to be called when websocket starts it's reconnection
- `thisContext: any`: `this` context to use when calling the callback function.
- => Returns an `off` method to cancel the event subscription.

#### `onDisconnected(callback, thisContext) => Function` - shorthand for `.on('disconnected', ...)`

- `callback: Function`: function to be called when websocket disconnected.
- `thisContext: any`: `this` context to use when calling the callback function.
- => Returns an `off` method to cancel the event subscription.

#### `onError(callback, thisContext) => Function` - shorthand for `.on('error', ...)`

- `callback: Function`: function to be called when an error occurs.
- `thisContext: any`: `this` context to use when calling the callback function.
- => Returns an `off` method to cancel the event subscription.

### `close() => void` - closes the WebSocket connection manually, and ignores `reconnect` logic if it was set to `true`.

### `use(middlewares: MiddlewareInterface[]) => SubscriptionClient` - adds middleware to modify `OperationOptions` per each request

- `middlewares: MiddlewareInterface[]` - Array contains list of middlewares (implemented `applyMiddleware` method) implementation, the `SubscriptionClient` will use the middlewares to modify `OperationOptions` for every operation

### `status: number` : returns the current socket's `readyState`
