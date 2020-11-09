//@flow

import {getMainDefinition} from '@apollo/client/utilities';
import {ApolloClient, ApolloLink, HttpLink, from, split} from '@apollo/client';
import {SubscriptionClient} from 'onegraph-subscription-client';

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
    uri.pathname = '/graphql';
    uri.searchParams.append('app_id', oneGraphAuth.appId);

    const httpLink = new HttpLink({
      uri: uri,
    });

    const subscriptionClient = new SubscriptionClient(oneGraphAuth.appId, {
      oneGraphAuth: oneGraphAuth,
      host: uri.host,
      lazy: true,
    });

    const authMiddleware = new ApolloLink((operation, forward) => {
      /**
       * Add the authorization to the headers
       * over http for queries and mutation
       */
      operation.setContext(({headers = {}}) => ({
        headers: {
          ...headers,
          ...oneGraphAuth.authHeaders(),
        },
      }));

      return forward(operation);
    });

    const splitLink = split(
      ({query}) => {
        const definition = getMainDefinition(query);
        return (
          definition.kind === 'OperationDefinition' &&
          definition.operation === 'subscription'
        );
      },
      subscriptionClient,
      from([authMiddleware, httpLink]),
    );

    super({
      uri: uri.toString(),
      link: splitLink,
      ...config,
    });
  }
}

export default OneGraphApolloClient;
