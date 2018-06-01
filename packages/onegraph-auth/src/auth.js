//@flow

import OAuthError from './oauthError';
const idx = require('idx');

export type Service =
  | 'eventil'
  | 'github'
  | 'google'
  | 'stripe'
  | 'twilio'
  | 'twitter'
  | 'zendesk';

export type Opts = {
  oneGraphOrigin?: string,
  appId: string,
  service: Service,
  oauthFinishOrigin?: string,
  oauthFinishPath?: string,
  saveAuthToStorage?: boolean,
};

export type AuthResponse = void; // TODO: proper auth response
export type LogoutResult = {
  result: 'success' | 'failure',
};

type Window = any;

type AccessToken = string;

type StateParam = string;

const POLL_INTERVAL = 35;

function friendlyServiceName(service: Service): string {
  switch (service) {
    case 'eventil':
      return 'Eventil';
    case 'google':
      return 'Google';
    case 'github':
      return 'GitHub';
    case 'stripe':
      return 'Stripe';
    case 'twilio':
      return 'Twilio';
    case 'twitter':
      return 'Twitter';
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
  friendlyServiceName: string,
  stateParam: StateParam,
): Window {
  const windowOpts = getWindowOpts();
  const authUrl = new URL(authUrlString);
  authUrl.searchParams.set('state', stateParam);
  return window.open(
    authUrl.toString(),
    `Log in with ${friendlyServiceName}`,
    Object.keys(windowOpts)
      .map(k => `${k}=${windowOpts[k]}`)
      .join(','),
  );
}

// Cycles path through URL.origin to ensure that it's the same format we'll
// see in the auth window's location
function normalizeRedirectOrigin(origin: string): string {
  return new URL(origin).origin;
}

// Cycles path through URL.pathname to ensure that it's the same format we'll
// see in the auth window's location
function normalizeRedirectPath(path: string): string {
  const u = new URL('https://example.com');
  u.pathname = path;
  const pathname = u.pathname;
  return pathname === '/' ? '' : pathname;
}

function loggedInQuery(service: Service): string {
  switch (service) {
    case 'eventil':
      return 'query { me { eventil { id }}}';
    case 'google':
      return 'query { me { google { sub }}}';
    case 'github':
      return 'query { me { github { id }}}';
    case 'stripe':
      return 'query { me { stripe { id }}}';
    case 'twilio':
      return 'query { me { twilio { id }}}';
    case 'twitter':
      return 'query { me { twitter { id }}}';
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
    case 'google':
      return !!idx(queryResult, _ => _.data.me.google.sub);
    case 'github':
      return !!idx(queryResult, _ => _.data.me.github.id);
    case 'stripe':
      return !!idx(queryResult, _ => _.data.me.stripe.id);
    case 'twilio':
      return !!idx(queryResult, _ => _.data.me.twilio.id);
    case 'twitter':
      return !!idx(queryResult, _ => _.data.me.twitter.id);
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
        google {
          sub
        }
        github {
          id
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
  accessToken: AccessToken,
): Promise<Object> {
  return fetch(fetchUrl, {
    method: 'POST',
    headers: {
      Authentication: `Bearer ${accessToken}`,
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
  accessToken?: ?AccessToken,
): Promise<Object> {
  const url = new URL(oneGraphOrigin);
  url.pathname = '/oauth/code';
  url.searchParams.set('app_id', appId);
  const redirectUri = redirectOrigin + redirectPath;
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('code', code);
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(accessToken ? {Authentication: `Bearer ${accessToken}`} : {}),
  };
  return fetch(url.toString(), {
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

const DEFAULT_ONEGRAPH_ORIGIN = 'https://serve.onegraph.com';

class OneGraphAuth {
  _authWindow: Window;
  _intervalId: ?IntervalID;
  _authUrl: string;
  _fetchUrl: string;
  service: Service;
  friendlyServiceName: string;
  _redirectOrigin: string;
  _redirectPath: string;
  _accessToken: ?string = null;
  _oneGraphOrigin: string;
  _redirectPath: string;
  _appId: string;

  constructor(opts: Opts) {
    const {service, appId, oauthFinishOrigin, oauthFinishPath} = opts;
    this.service = service;
    this.friendlyServiceName = friendlyServiceName(this.service);
    this._oneGraphOrigin = opts.oneGraphOrigin || DEFAULT_ONEGRAPH_ORIGIN;
    this._appId = appId;
    const authUrl = new URL(this._oneGraphOrigin);
    authUrl.pathname = '/oauth/start';
    authUrl.searchParams.set('service', service);
    authUrl.searchParams.set('app_id', appId);
    authUrl.searchParams.set('response_type', 'code');
    this._redirectOrigin = normalizeRedirectOrigin(
      oauthFinishOrigin || window.location.origin,
    );
    if (this._redirectOrigin !== window.location.origin) {
      console.warn('oauthFinishOrigin does not match window.location.origin');
    }
    authUrl.searchParams.set('redirect_origin', this._redirectOrigin);
    this._redirectPath = normalizeRedirectPath(
      oauthFinishPath || window.location.pathname,
    );

    authUrl.searchParams.set('redirect_path', this._redirectPath);

    this._authUrl = authUrl.toString();

    const fetchUrl = new URL(opts.oneGraphOrigin || DEFAULT_ONEGRAPH_ORIGIN);
    fetchUrl.pathname = '/dynamic';
    fetchUrl.searchParams.set('app_id', appId);
    this._fetchUrl = fetchUrl.toString();
  }

  cleanup = () => {
    this._intervalId && clearInterval(this._intervalId);
    this._authWindow && this._authWindow.close();
  };

  accessToken = () => this._accessToken;

  authHeaders = () => {
    if (this._accessToken) {
      return {Authentication: `Bearer ${this._accessToken}`};
    } else {
      return {};
    }
  };

  _waitForAuthFinish = (stateParam: StateParam): Promise<AuthResponse> => {
    return new Promise((resolve, reject) => {
      this._intervalId = setInterval(() => {
        try {
          const authLocation = this._authWindow.location;
          if (authLocation.origin === this._redirectOrigin) {
            const params = new URL(authLocation).searchParams;
            if (stateParam !== params.get('state')) {
              reject(
                new OAuthError({
                  error: 'invalid_request',
                  error_description: 'The state param does not match',
                }),
              );
            } else {
              const code = params.get('code');
              if (!code) {
                reject(
                  new OAuthError({
                    error: 'invalid_grant',
                    error_description: 'Missing code',
                  }),
                );
              } else {
                exchangeCode(
                  this._oneGraphOrigin,
                  this._appId,
                  this._redirectOrigin,
                  this._redirectPath,
                  code,
                  this._accessToken,
                )
                  .then(response => {
                    if (response.error) {
                      reject(new OAuthError(response));
                    } else if (response.access_token) {
                      this._accessToken = response.access_token;
                      resolve();
                    } else {
                      reject(new Error('Unexpected result from server'));
                    }
                  })
                  .catch(e => reject(e));
              }
            }
            this.cleanup();
          }
        } catch (e) {
          if (e instanceof window.DOMException) {
            // do nothing--probably on the service's or onegraph's domain
          } else {
            console.error('unexpected error waiting for auth to finish', e);
            this.cleanup();
            reject(e);
          }
        }
      }, POLL_INTERVAL);
    });
  };

  login = (): Promise<AuthResponse> => {
    this.cleanup();
    const stateParam = makeStateParam();
    this._authWindow = createAuthWindow(
      this._authUrl,
      this.service,
      this.friendlyServiceName,
      stateParam,
    );
    return this._waitForAuthFinish(stateParam);
  };

  isLoggedIn = (): Promise<boolean> => {
    const accessToken = this._accessToken;
    if (accessToken) {
      return fetchQuery(
        this._fetchUrl,
        loggedInQuery(this.service),
        accessToken,
      ).then(result => getIsLoggedIn(result, this.service));
    } else {
      console.warn('Asking for isLoggedIn without any access token');
      return Promise.resolve(false);
    }
  };

  logout = (): Promise<LogoutResult> => {
    this.cleanup();
    const accessToken = this._accessToken;
    if (accessToken) {
      return fetchQuery(
        this._fetchUrl,
        logoutMutation(this.service),
        accessToken,
      ).then(result => {
        const loggedIn = getIsLoggedIn(
          {data: result.signoutServices},
          this.service,
        );
        return {result: loggedIn ? 'failure' : 'success'};
      });
    } else {
      return Promise.resolve({result: 'failure'});
    }
  };
}

export default OneGraphAuth;
