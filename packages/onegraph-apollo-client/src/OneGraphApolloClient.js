import {ApolloClient} from 'apollo-client';
import {HttpLink} from 'apollo-link-http';
import {InMemoryCache} from 'apollo-cache-inmemory';

const DEFAULT_ONE_GRAPH_URL = 'https://serve.onegraph.com/dynamic';

function validateConfig(config) {
  if (!config.applicationId) {
    throw new Error(
      'createApolloClient was called with invalid config: missing applicationId',
    );
  }
}

function createApolloClient(config) {
  const uri = new URL(config.oneGraphUrl || DEFAULT_ONE_GRAPH_URL);
  uri.searchParams.add('applicationId', config.applicationId);
  return new ApolloClient({
    // By default, this client will send queries to the
    //  `/graphql` endpoint on the same host
    link: new HttpLink({
      uri,
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    }),
    cache: new InMemoryCache(),
    dataIdFromObject: object => `${object.__typename}-${object.id}`,
  });
}

export default createApolloClient;
