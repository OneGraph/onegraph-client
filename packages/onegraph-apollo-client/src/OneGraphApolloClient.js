import {ApolloClient} from 'apollo-client';
import {HttpLink} from 'apollo-link-http';
import {InMemoryCache} from 'apollo-cache-inmemory';

const DEFAULT_ONE_GRAPH_URL = 'https://serve.onegraph.com/dynamic';

function validateConfig(config) {
  if (!config.appId) {
    throw new Error(
      'createApolloClient was called with invalid config: missing appId'
    );
  }
}

class OneGraphApolloClient extends ApolloClient {
  constructor(config) {
    validateConfig(config);
    const uri = new URL(config.oneGraphUrl || DEFAULT_ONE_GRAPH_URL);
    uri.searchParams.append('app_id', config.appId);
    super({
      link: new HttpLink({
        uri,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      }),
      cache: new InMemoryCache(),
      dataIdFromObject: object => `${object.__typename}-${object.id}`,
      ...config,
    });
  }
}

export default OneGraphApolloClient;
