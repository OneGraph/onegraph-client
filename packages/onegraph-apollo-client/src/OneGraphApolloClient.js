//@flow

import ApolloClient from 'apollo-boost';

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

    super({
      uri: uri.toString(),
      request: operation =>
        operation.setContext({headers: oneGraphAuth.authHeaders()}),
      ...config,
    });
  }
}

export default OneGraphApolloClient;
