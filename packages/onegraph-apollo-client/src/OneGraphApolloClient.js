//@flow

import {ApolloClient} from 'apollo-client';
import {HttpLink} from 'apollo-link-http';
import {ApolloLink} from 'apollo-link';
import {InMemoryCache} from 'apollo-cache-inmemory';

import type {OneGraphAuth} from 'onegraph-auth';

export type OneGraphApolloClientConfig = {
  oneGraphAuth: OneGraphAuth,
};

function validateConfig(config) {
  if (!config.oneGraphAuth) {
    throw new Error(
      'createApolloClient was called with invalid config: missing oneGraphAuth',
    );
  }
}

class OneGraphApolloClient extends ApolloClient {
  constructor(config: OneGraphApolloClientConfig) {
    validateConfig(config);
    const {oneGraphAuth} = config;
    const uri = new URL(oneGraphAuth.oneGraphOrigin);
    uri.pathname = '/dynamic';
    uri.searchParams.append('app_id', oneGraphAuth.appId);
    const httpLink = new HttpLink({uri});
    const authMiddlewareLink = new ApolloLink((operation, forward) => {
      operation.setContext({
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...config.oneGraphAuth.authHeaders(),
        },
      });
      return forward(operation);
    });
    super({
      link: authMiddlewareLink.concat(httpLink),
      cache: new InMemoryCache(),
      ...config,
    });
  }
}

export default OneGraphApolloClient;
