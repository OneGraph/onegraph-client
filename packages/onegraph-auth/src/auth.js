//@flow

import OAuthError from './oauthError';
import {hasLocalStorage, InMemoryStorage, LocalStorage} from './storage';
import URI from './uri';
const idx = require('idx');

import type {Storage} from './storage';

export type Service =
  | 'eventil'
  | 'github'
  | 'gmail'
  | 'google'
  | 'google-compute'
  | 'google-docs'
  | 'salesforce'
  | 'stripe'
  | 'twilio'
  | 'twitter'
  | 'youtube'
  | 'zendesk';

export type Opts = {
  oneGraphOrigin?: string,
  appId: string,
  service: Service,
  oauthFinishOrigin?: string,
  oauthFinishPath?: string,
  saveAuthToStorage?: boolean,
  storage?: Storage,
};

export type LogoutResult = {
  result: 'success' | 'failure',
};

type Token = {
  accessToken: string,
  expireDate: number,
};

export type AuthResponse = {token: Token};

type Window = any;

type StateParam = string;

const POLL_INTERVAL = 35;

function friendlyServiceName(service: Service): string {
  switch (service) {
    case 'eventil':
      return 'Eventil';
    case 'github':
      return 'GitHub';
    case 'gmail':
      return 'Gmail';
    case 'google':
      return 'Google';
    case 'google-compute':
      return 'Google Compute';
    case 'google-docs':
      return 'Google Docs';
    case 'salesforce':
      return 'Salesforce';
    case 'stripe':
      return 'Stripe';
    case 'twilio':
      return 'Twilio';
    case 'twitter':
      return 'Twitter';
    case 'youtube':
      return 'YouTube';
    case 'zendesk':
      return 'Zendesk';
    default:
      (service: empty); // exhaustive switch check from flow
      throw new Error('No such service');
  }
}

function getWindowOpts(): Object {
  const windowWidth = Math.min(800, Math.floor(window.outerWidth * 0.8));
  const windowHeight = Math.min(630, Math.floor(window.outerHeight * 0.5));
  const windowArea = {
    width: windowWidth,
    height: windowHeight,
    left: Math.round(window.screenX + (window.outerWidth - windowWidth) / 2),
    top: Math.round(window.screenY + (window.outerHeight - windowHeight) / 8),
  };

  // TODO: figure out how to show the toolbar icons in the window for password managers
  return {
    width: windowArea.width,
    height: windowArea.height,
    left: windowArea.left,
    top: windowArea.top,
    toolbar: 0,
    scrollbars: 1,
    status: 1,
    resizable: 1,
    menuBar: 0,
  };
}

function createAuthWindow(
  authUrlString: string,
  service: Service,
  stateParam: StateParam,
): Window {
  const windowOpts = getWindowOpts();
  const authUrl = URI.addQueryParams(URI.parse(authUrlString), {
    state: stateParam,
  });
  return window.open(
    URI.toString(authUrl),
    `Log in with ${friendlyServiceName(service)}`,
    Object.keys(windowOpts)
      .map(k => `${k}=${windowOpts[k]}`)
      .join(','),
  );
}

// Cycles path through URL.origin to ensure that it's the same format we'll
// see in the auth window's location
function normalizeRedirectOrigin(origin: string): string {
  return URI.parse(origin).origin;
}

// Cycles path through URL.pathname to ensure that it's the same format we'll
// see in the auth window's location
function normalizeRedirectPath(path: string): string {
  return path === '/' ? '' : path;
}

function loggedInQuery(service: Service): string {
  switch (service) {
    case 'eventil':
      return 'query { me { eventil { id }}}';
    case 'github':
      return 'query { me { github { id }}}';
    case 'gmail':
      return 'query { me { gmail { sub }}}';
    case 'google':
      return 'query { me { google { sub }}}';
    case 'google-compute':
      return 'query { me { googleCompute { sub }}}';
    case 'google-docs':
      return 'query { me { googleDocs { sub }}}';
    case 'salesforce':
      return 'query { me { salesforce { sub }}}';
    case 'stripe':
      return 'query { me { stripe { id }}}';
    case 'twilio':
      return 'query { me { twilio { id }}}';
    case 'twitter':
      return 'query { me { twitter { id }}}';
    case 'youtube':
      return 'query { me { youTube { sub }}}';
    case 'zendesk':
      return 'query { me { zendesk { id }}}';
    default:
      (service: empty); // exhaustive switch check from flow
      throw new Error('No such service ' + service);
  }
}

function getIsLoggedIn(queryResult: Object, service: Service): boolean {
  switch (service) {
    case 'eventil':
      return !!idx(queryResult, _ => _.data.me.eventil.id);
    case 'github':
      return !!idx(queryResult, _ => _.data.me.github.id);
    case 'gmail':
      return !!idx(queryResult, _ => _.data.me.gmail.sub);
    case 'google':
      return !!idx(queryResult, _ => _.data.me.google.sub);
    case 'google-compute':
      return !!idx(queryResult, _ => _.data.me.googleCompute.sub);
    case 'google-docs':
      return !!idx(queryResult, _ => _.data.me.googleDocs.sub);
    case 'salesforce':
      return !!idx(queryResult, _ => _.data.me.salesforce.sub);
    case 'stripe':
      return !!idx(queryResult, _ => _.data.me.stripe.id);
    case 'twilio':
      return !!idx(queryResult, _ => _.data.me.twilio.id);
    case 'twitter':
      return !!idx(queryResult, _ => _.data.me.twitter.id);
    case 'youtube':
      return !!idx(queryResult, _ => _.data.me.youTube.sub);
    case 'zendesk':
      return !!idx(queryResult, _ => _.data.me.zendesk.id);
    default:
      (service: empty); // exhaustive switch check from flow
      throw new Error('No such service ' + service);
  }
}

function logoutMutation(service: Service): string {
  const serviceEnum = service.toUpperCase();
  return `mutation {
    signoutServices(data: {services: [${serviceEnum}]}) {
      me {
        eventil {
          id
        }
        github {
          id
        }
        gmail {
          sub
        }
        google {
          sub
        }
        googleCompute {
          sub
        }
        googleDocs {
          sub
        }
        salesforce {
          sub
        }
        stripe {
          id
        }
        twilio {
          id
        }
        twitter {
          id
        }
        youTube {
          sub
        }
        zendesk {
          id
        }
      }
    }
  }`;
}

function fetchQuery(
  fetchUrl: string,
  query: string,
  token: Token,
): Promise<Object> {
  return fetch(fetchUrl, {
    method: 'POST',
    headers: {
      Authentication: `Bearer ${token.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({query}),
  }).then(response => response.json());
}

function exchangeCode(
  oneGraphOrigin: string,
  appId: string,
  redirectOrigin: string,
  redirectPath: string,
  code: string,
  token?: ?Token,
): Promise<Object> {
  const redirectUri = redirectOrigin + redirectPath;
  const url = URI.make({
    origin: oneGraphOrigin,
    path: '/oauth/code',
    query: {
      app_id: appId,
      redirect_uri: redirectUri,
      code,
    },
  });
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? {Authentication: `Bearer ${token.accessToken}`} : {}),
  };
  return fetch(URI.toString(url), {
    method: 'POST',
    headers,
  }).then(response => response.json());
}

function byteArrayToString(byteArray) {
  return byteArray.reduce(
    (acc, byte) => acc + (byte & 0xff).toString(16).slice(-2),
    '',
  );
}

function makeStateParam(): StateParam {
  return byteArrayToString(window.crypto.getRandomValues(new Uint8Array(32)));
}

function isExpired(token: Token): boolean {
  return token.expireDate < Date.now();
}

function tokenFromStorage(storage: Storage, appId: string): ?Token {
  const v = storage.getItem(appId);
  if (v) {
    const possibleToken = JSON.parse(v);
    if (
      typeof possibleToken.accessToken === 'string' &&
      typeof possibleToken.expireDate === 'number' &&
      !isExpired(possibleToken)
    ) {
      return possibleToken;
    }
  }
  return null;
}

const DEFAULT_ONEGRAPH_ORIGIN = 'https://serve.onegraph.com';

class OneGraphAuth {
  _authWindows: {[service: Service]: Window} = {};
  _intervalIds: {[service: Service]: IntervalID} = {};
  _fetchUrl: string;
  _redirectOrigin: string;
  _redirectPath: string;
  _accessToken: ?Token = null;
  oneGraphOrigin: string;
  _redirectPath: string;
  appId: string;
  _storageKey: string;
  _storage: Storage;

  constructor(opts: Opts) {
    const {appId, oauthFinishOrigin, oauthFinishPath} = opts;
    this.oneGraphOrigin = opts.oneGraphOrigin || DEFAULT_ONEGRAPH_ORIGIN;
    this.appId = appId;
    this._redirectOrigin = normalizeRedirectOrigin(
      oauthFinishOrigin || window.location.origin,
    );
    if (this._redirectOrigin !== window.location.origin) {
      console.warn('oauthFinishOrigin does not match window.location.origin');
    }
    this._redirectPath = normalizeRedirectPath(
      oauthFinishPath || window.location.pathname,
    );

    const fetchUrl = URI.make({
      origin: opts.oneGraphOrigin || DEFAULT_ONEGRAPH_ORIGIN,
      path: '/dynamic',
      query: {app_id: appId},
    });
    this._fetchUrl = URI.toString(fetchUrl);
    this._storage =
      opts.storage || hasLocalStorage()
        ? new LocalStorage()
        : new InMemoryStorage();
    this._storageKey = this.appId;
    this._accessToken = tokenFromStorage(this._storage, this._storageKey);
  }

  _clearInterval = (service: Service) => {
    clearInterval(this._intervalIds[service]);
    delete this._intervalIds[service];
  };

  _clearAuthWindow = (service: Service) => {
    const w = this._authWindows[service];
    w && w.close();
    delete this._authWindows[service];
  };

  cleanup = (service: Service) => {
    this._clearInterval(service);
    this._clearAuthWindow(service);
  };

  accessToken = (): ?Token => this._accessToken;

  authHeaders = (): {Authentication?: string} => {
    if (this._accessToken) {
      return {Authentication: `Bearer ${this._accessToken.accessToken}`};
    } else {
      return {};
    }
  };

  friendlyServiceName(service: Service): string {
    return friendlyServiceName(service);
  }

  _makeAuthUrl = (service: Service): string => {
    const authUrl = URI.make({
      origin: this.oneGraphOrigin,
      path: '/oauth/start',
      query: {
        service,
        app_id: this.appId,
        response_type: 'code',
        redirect_origin: this._redirectOrigin,
        redirect_path: this._redirectPath,
      },
    });
    return URI.toString(authUrl);
  };

  _setToken = (token: Token) => {
    this._accessToken = token;
    this._storage.setItem(this._storageKey, JSON.stringify(token));
  };

  _waitForAuthFinish = (
    service: Service,
    stateParam: StateParam,
  ): Promise<AuthResponse> => {
    return new Promise((resolve, reject) => {
      this._intervalIds[service] = setInterval(() => {
        try {
          const authLocation = this._authWindows[service].location;
          if (authLocation.origin === this._redirectOrigin) {
            const params = URI.parse(authLocation.href).query;
            if (stateParam !== params.state) {
              reject(
                new OAuthError({
                  error: 'invalid_request',
                  error_description: 'The state param does not match',
                }),
              );
            } else {
              const code = params.code;
              if (!code) {
                reject(
                  new OAuthError({
                    error: 'invalid_grant',
                    error_description: 'Missing code',
                  }),
                );
              } else {
                exchangeCode(
                  this.oneGraphOrigin,
                  this.appId,
                  this._redirectOrigin,
                  this._redirectPath,
                  code,
                  this._accessToken,
                )
                  .then(response => {
                    if (response.error) {
                      reject(new OAuthError(response));
                    } else if (
                      typeof response.access_token === 'string' &&
                      typeof response.expires_in === 'number'
                    ) {
                      const token: Token = {
                        accessToken: response.access_token,
                        expireDate: Date.now() + response.expires_in * 1000,
                      };
                      this._setToken(token);
                      resolve({token});
                    } else {
                      reject(new Error('Unexpected result from server'));
                    }
                  })
                  .catch(e => reject(e));
              }
            }
            this.cleanup(service);
          }
        } catch (e) {
          if (e instanceof window.DOMException) {
            // do nothing--probably on the service's or onegraph's domain
          } else {
            console.error(
              'unexpected error waiting for auth to finish for ' + service,
              e,
            );
            this.cleanup(service);
            reject(e);
          }
        }
      }, POLL_INTERVAL);
    });
  };

  login = (service: Service): Promise<AuthResponse> => {
    this.cleanup(service);
    const stateParam = makeStateParam();
    this._authWindows[service] = createAuthWindow(
      this._makeAuthUrl(service),
      service,
      stateParam,
    );
    return this._waitForAuthFinish(service, stateParam);
  };

  isLoggedIn = (service: Service): Promise<boolean> => {
    const accessToken = this._accessToken;
    if (accessToken) {
      return fetchQuery(
        this._fetchUrl,
        loggedInQuery(service),
        accessToken,
      ).then(result => getIsLoggedIn(result, service));
    } else {
      return Promise.resolve(false);
    }
  };

  logout = (service: Service): Promise<LogoutResult> => {
    this.cleanup(service);
    const accessToken = this._accessToken;
    if (accessToken) {
      return fetchQuery(
        this._fetchUrl,
        logoutMutation(service),
        accessToken,
      ).then(result => {
        const loggedIn = getIsLoggedIn({data: result.signoutServices}, service);
        return {result: loggedIn ? 'failure' : 'success'};
      });
    } else {
      return Promise.resolve({result: 'failure'});
    }
  };

  destroy = () => {
    Object.keys(this._intervalIds).forEach(key => this.cleanup(key));
    Object.keys(this._authWindows).forEach(key => this.cleanup(key));
    this._storage.removeItem(this._storageKey);
  };
}

export default OneGraphAuth;
