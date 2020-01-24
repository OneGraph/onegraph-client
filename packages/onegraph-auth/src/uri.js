// @flow

type Query = {[param: string]: string};

type URI = {
  origin: string,
  path: string,
  query: Query,
};

const URI_REGEX = new RegExp(
  [
    '^(https?://[^:/?#]*(?::[0-9]+)?)', // origin
    '(/{0,1}[^?#]*)', // path
    '(\\?[^#]*|)', // search
    '(#.*|)$', // hash
  ].join(''),
);

function parseQuery(queryString): Query {
  return queryString.split(/[?&]/).reduce((query, part) => {
    const [param, value] = part.split('=');
    if (param != null && value != null) {
      query[param] = value;
    }
    return query;
  }, {});
}

function parse(uriString: string): URI {
  const match = uriString.match(URI_REGEX);
  if (!match) {
    throw new Error('invalid url ' + uriString);
  }
  return {
    origin: match[1],
    path: match[2],
    query: parseQuery(match[3]),
  };
}

function safeParse(uriString: string): ?URI {
  try {
    return parse(uriString);
  } catch (e) {
    return null;
  }
}

function addQueryParams(uri: URI, query: Query): URI {
  return {
    ...uri,
    query: {
      ...uri.query,
      ...query,
    },
  };
}

function setPath(uri: URI, path: string): URI {
  return {
    ...uri,
    path,
  };
}

function queryToString(query: Query): string {
  return Object.keys(query)
    .map(k => `${k}=${query[k]}`)
    .join('&');
}

function toString(uri: URI): string {
  const {origin, path, query} = uri;
  const queryString = queryToString(query);
  return origin + path + (queryString ? `?${queryString}` : '');
}

type MakeArgs = {origin: string, path: string, query: Query};

function make({origin, path, query}: MakeArgs): URI {
  let uri = parse(origin);
  uri = setPath(uri, path);
  uri = addQueryParams(uri, query);
  return uri;
}

export default {
  parse,
  safeParse,
  addQueryParams,
  setPath,
  toString,
  make,
  queryToString,
};
