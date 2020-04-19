//@flow

import {uuid} from './uuid';
import {fetchUuid} from './fetch';

import {SubscriptionClient} from 'subscriptions-transport-ws/dist/client';

import type {OneGraphAuth} from 'onegraph-auth';

function getConnectionParams() {
  return new Promise(function (resolve, reject) {
    const sessionId = uuid();
    if (sessionId) {
      resolve({sessionId});
    } else {
      fetchUuid()
        .then(function (uuid) {
          if (!uuid) {
            reject(
              'Unable to generate sessionId to start subscription connection',
            );
          } else {
            resolve({sessionId: uuid});
          }
        })
        .catch(function (e) {
          reject(e);
        });
    }
  });
}

function middleware(auth: ?OneGraphAuth) {
  if (!auth) {
    return [];
  }
  return [
    {
      applyMiddleware(opts, next) {
        const token = auth.accessToken();
        opts.extensions = {
          ...(token ? {accessToken: token.accessToken} : {}),
          ...(opts.extensions || {}),
        };
        next();
      },
    },
  ];
}

type Options = {
  host?: ?string,
  oneGraphAuth?: ?OneGraphAuth,
  timeout?: number,
  lazy?: boolean,
  reconnect?: boolean,
  reconnectionAttempts?: number,
  connectionCallback?: (?Error) => {},
  inactivityTimeout?: number,
};

class OneGraphSubscriptionClient extends SubscriptionClient<
  string,
  ?Options,
  ?any,
  ?(string | Array<string>),
> {
  close = (isForced?: boolean = true, closedByUser?: boolean = true) => {
    super.close(isForced, closedByUser);
    if (
      isForced &&
      typeof window !== 'undefined' &&
      window.removeEventListener
    ) {
      window.removeEventListener('beforeunload', this._cleanup);
    }
  };

  _cleanup = () => this.close(true);
  constructor(
    appId: string,
    options?: ?Options,
    webSocketImpl?: ?any,
    webSocketProtocols?: string | Array<string>,
  ) {
    if (!appId) {
      throw new Error('Unable to start subscriptions client. Missing appId');
    }
    const host = (options && options.host) || 'serve.onegraph.com';
    super(
      `wss://${host}/ws?app_id=${appId}`,
      {
        ...(options || {}),
        connectionParams: getConnectionParams(),
      },
      webSocketImpl,
      webSocketProtocols,
    ).use(middleware(options ? options.oneGraphAuth : null));

    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('beforeunload', this._cleanup);
    }
  }
}

export default OneGraphSubscriptionClient;
