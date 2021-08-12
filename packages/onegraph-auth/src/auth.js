//@flow

import OAuthError from './oauthError';
import {hasLocalStorage, InMemoryStorage, LocalStorage} from './storage';
import URI from './uri';
import PKCE from './pkce';
import {findMissingAuthServices} from './helpers';
// $FlowFixMe
const idx = require('idx');

import type {Storage} from './storage';

export type Service =
  | 'adroll'
  | 'asana'
  | 'box'
  | 'contentful'
  | 'dev-to'
  | 'dribbble'
  | 'dropbox'
  | 'eggheadio'
  | 'eventil'
  | 'facebook'
  | 'firebase'
  | 'github'
  | 'gmail'
  | 'google'
  | 'google-ads'
  | 'google-analytics'
  | 'google-calendar'
  | 'google-compute'
  | 'google-docs'
  | 'google-search-console'
  | 'google-translate'
  | 'hubspot'
  | 'intercom'
  | 'mailchimp'
  | 'meetup'
  | 'netlify'
  | 'product-hunt'
  | 'quickbooks'
  | 'salesforce'
  | 'slack'
  | 'spotify'
  | 'stripe'
  | 'trello'
  | 'twilio'
  | 'twitch-tv'
  | 'twitter'
  | 'ynab'
  | 'youtube'
  | 'zeit'
  | 'zendesk';

type CommunicationMode = 'post_message' | 'redirect';

export type Opts = {
  oneGraphOrigin?: string,
  appId: string,
  oauthFinishOrigin?: string,
  oauthFinishPath?: string,
  saveAuthToStorage?: boolean,
  storage?: Storage,
  communicationMode?: CommunicationMode,
  graphqlUrl?: ?string,
};

export type LogoutResult = {
  result: 'success' | 'failure',
};

type Token = {
  accessToken: string,
  expireDate: number,
  refreshToken?: ?string,
};

export type ServiceStatus = {
  isLoggedIn: boolean,
};

export type LoggedInServices = {
  [service: string]: {
    serviceEnum: string,
    foreignUserIds: Array<string>,
    usedTestFlow: boolean,
  },
};

export type ServiceInfo = {
  service: string,
  serviceEnum: string,
  friendlyServiceName: string,
  supportsTestFlow: boolean,
};

export type ServicesList = Array<ServiceInfo>;

export type ServicesStatus = {
  [service: Service]: ServiceStatus,
};

export type AuthResponse = {token: Token};

type Window = any;

type StateParam = string;

const POLL_INTERVAL = 35;

const ALL_SERVICES = [
  'adroll',
  'asana',
  'box',
  'contentful',
  'dev-to',
  'dribbble',
  'dropbox',
  'eggheadio',
  'eventil',
  'facebook',
  'firebase',
  'github',
  'gmail',
  'google',
  'google-ads',
  'google-analytics',
  'google-calendar',
  'google-compute',
  'google-docs',
  'google-search-console',
  'google-translate',
  'hubspot',
  'intercom',
  'mailchimp',
  'meetup',
  'netlify',
  'product-hunt',
  'quickbooks',
  'salesforce',
  'slack',
  'spotify',
  'stripe',
  'trello',
  'twilio',
  'twitch-tv',
  'twitter',
  'ynab',
  'youtube',
  'zeit',
  'zendesk',
];

function friendlyServiceName(service: Service): string {
  switch (service) {
    case 'adroll':
      return 'Adroll';
    case 'asana':
      return 'Asana';
    case 'box':
      return 'Box';
    case 'dev-to':
      return 'Dev.to';
    case 'dribbble':
      return 'Dribbble';
    case 'dropbox':
      return 'Dropbox';
    case 'contentful':
      return 'Contentful';
    case 'eggheadio':
      return 'Egghead.io';
    case 'eventil':
      return 'Eventil';
    case 'facebook':
      return 'Facebook';
    case 'firebase':
      return 'Firebase';
    case 'github':
      return 'GitHub';
    case 'gmail':
      return 'Gmail';
    case 'google':
      return 'Google';
    case 'google-ads':
      return 'Google Ads';
    case 'google-analytics':
      return 'Google Analytics';
    case 'google-calendar':
      return 'Google Calendar';
    case 'google-compute':
      return 'Google Compute';
    case 'google-docs':
      return 'Google Docs';
    case 'google-search-console':
      return 'Google Search Console';
    case 'google-translate':
      return 'Google Translate';
    case 'hubspot':
      return 'Hubspot';
    case 'intercom':
      return 'Intercom';
    case 'mailchimp':
      return 'Mailchimp';
    case 'meetup':
      return 'Meetup';
    case 'netlify':
      return 'Netlify';
    case 'product-hunt':
      return 'Product Hunt';
    case 'quickbooks':
      return 'QuickBooks';
    case 'salesforce':
      return 'Salesforce';
    case 'slack':
      return 'Slack';
    case 'spotify':
      return 'Spotify';
    case 'stripe':
      return 'Stripe';
    case 'trello':
      return 'Trello';
    case 'twilio':
      return 'Twilio';
    case 'twitter':
      return 'Twitter';
    case 'twitch-tv':
      return 'Twitch';
    case 'ynab':
      return 'You Need a Budget';
    case 'youtube':
      return 'YouTube';
    case 'zeit':
      return 'Vercel';
    case 'zendesk':
      return 'Zendesk';
    default:
      (service: empty); // exhaustive switch check from flow
      return service;
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

function createAuthWindow({
  url,
  service,
}: {
  url?: ?string,
  service: Service,
}): Window {
  const windowOpts = getWindowOpts();
  const w = window.open(
    url || '',
    // A unqiue name prevents orphaned popups from stealing our window.open
    `${service}_${Math.random()}`.replace('.', ''),
    Object.keys(windowOpts)
      .map((k) => `${k}=${windowOpts[k]}`)
      .join(','),
  );
  if (!url && w && w.document) {
    try {
      w.document.title = `Log in with ${friendlyServiceName(service)}`;
      w.document.body.innerHTML = `<div style="display:flex;justify-content:center;align-items:center;height:100vh;width:100vw%"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid" width="48px" height="48px" style="background: none;"><circle cx="50" cy="50" fill="none" stroke="#3cc7b6" stroke-width="8" r="24" stroke-dasharray="112 40" transform="rotate(138.553 50 50)"><animateTransform attributeName="transform" type="rotate" calcMode="linear" values="0 50 50;360 50 50" keyTimes="0;1" dur="1s" begin="0s" repeatCount="indefinite"></animateTransform></circle></svg></div>`;
    } catch (e) {}
  }
  return w;
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

const loggedInQuery = `
query LoggedInQuery {
  me {
    serviceMetadata {
      loggedInServices {
        service
        foreignUserId
        usedTestFlow
      }
    }
  }
}
`;

const allServicesQuery = `
query AllServicesQuery {
  oneGraph {
    services(filter: {supportsOauthLogin: true}) {
      service
      friendlyServiceName
      supportsTestFlow
    }
  }
}
`;

function getServiceEnum(service: string): string {
  return service.toUpperCase().replace(/-/g, '_');
}

function fromServiceEnum(serviceEnum: string): string {
  return serviceEnum.toLowerCase().replace(/_/g, '-');
}

function getIsLoggedIn(
  queryResult: Object,
  service: string,
  foreignUserId?: ?string,
): boolean {
  const serviceEnum = getServiceEnum(service);
  const loggedInServices =
    idx(queryResult, (_) => _.data.me.serviceMetadata.loggedInServices) || [];
  return !!loggedInServices.find(
    (serviceInfo) =>
      serviceInfo.service === serviceEnum &&
      (!foreignUserId || foreignUserId === serviceInfo.foreignUserId),
  );
}

function getServiceErrors(errors, service) {
  return errors.filter((error) => error.path && error.path.includes(service));
}

const logoutMutation = `mutation SignOutServicesMutation(
  $services: [OneGraphServiceEnum!]!
) {
  signoutServices(data: { services: $services }) {
    me {
      serviceMetadata {
        loggedInServices {
          service
          foreignUserId
        }
      }
    }
  }
}`;

const logoutUserMutation = `mutation SignOutServicesMutation(
  $service: OneGraphServiceEnum!
  $foreignUserId: String!
) {
  signoutServiceUser(
    input: {
      service: $service
      foreignUserId: $foreignUserId
    }
  ) {
    me {
      serviceMetadata {
        loggedInServices {
          service
          foreignUserId
        }
      }
    }
  }
}`;

function fetchQuery(
  fetchUrl: string,
  query: string,
  variables: {[key: string]: any},
  token?: ?Token,
): Promise<Object> {
  const headers: {[key: string]: string} = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token.accessToken}`;
  }
  return fetch(fetchUrl, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({query, variables}),
  }).then((response) => response.json());
}

function exchangeCode(
  oneGraphOrigin: string,
  appId: string,
  redirectOrigin: string,
  redirectPath: string,
  code: string,
  token?: ?Token,
  verifier: string,
): Promise<Object> {
  const redirectUri = redirectOrigin + redirectPath;
  const url = URI.make({
    origin: oneGraphOrigin,
    path: '/oauth/code',
    query: {
      app_id: appId,
      redirect_uri: redirectUri,
      code,
      code_verifier: verifier,
    },
  });
  const headers: {[key: string]: string} = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token.accessToken}`;
  }
  return fetch(URI.toString(url), {
    method: 'POST',
    headers,
  }).then((response) => response.json());
}

function exchangeRefreshToken(
  oneGraphOrigin: string,
  appId: string,
  refreshToken: string,
): Promise<Object> {
  const url = URI.make({
    origin: oneGraphOrigin,
    path: '/oauth/token',
    query: {
      app_id: appId,
    },
  });
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    accept: 'application/json',
  };
  return fetch(URI.toString(url), {
    method: 'POST',
    headers,
    body: URI.queryToString({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  }).then((response) => response.json());
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
  _messageListeners: {[service: Service]: any} = {};
  _fetchUrl: string;
  _redirectOrigin: string;
  _redirectPath: string;
  _accessToken: ?Token = null;
  oneGraphOrigin: string;
  _redirectPath: string;
  appId: string;
  _storageKey: string;
  _storage: Storage;
  _communicationMode: CommunicationMode;
  supportedServices: Array<string> = ALL_SERVICES;

  constructor(opts: Opts) {
    const {appId, oauthFinishOrigin, oauthFinishPath} = opts;
    this.oneGraphOrigin = opts.oneGraphOrigin || DEFAULT_ONEGRAPH_ORIGIN;
    this.appId = appId;
    const windowUri = URI.parse(window.location.toString());
    this._redirectOrigin = normalizeRedirectOrigin(
      oauthFinishOrigin || windowUri.origin,
    );
    if (this._redirectOrigin !== windowUri.origin) {
      console.warn('oauthFinishOrigin does not match window.location.origin');
    }
    this._redirectPath = normalizeRedirectPath(
      oauthFinishPath || windowUri.path,
    );

    const fetchUrl = URI.make({
      origin: opts.oneGraphOrigin || DEFAULT_ONEGRAPH_ORIGIN,
      path: '/dynamic',
      query: {app_id: appId},
    });
    this._fetchUrl = opts.graphqlUrl || URI.toString(fetchUrl);
    this._storage =
      opts.storage ||
      (hasLocalStorage() ? new LocalStorage() : new InMemoryStorage());
    this._storageKey = this.appId;
    this._accessToken = tokenFromStorage(this._storage, this._storageKey);
    this._communicationMode = opts.communicationMode || 'post_message';
  }

  _clearInterval: (service: Service) => void = (service: Service) => {
    clearInterval(this._intervalIds[service]);
    delete this._intervalIds[service];
  };

  _clearMessageListener: (service: Service) => void = (service: Service) => {
    window.removeEventListener(
      'message',
      this._messageListeners[service],
      false,
    );
    delete this._messageListeners[service];
  };

  closeAuthWindow: (service: Service) => void = (service: Service) => {
    const w = this._authWindows[service];
    w && w.close();
    delete this._authWindows[service];
  };

  cleanup: (service: Service) => void = (service: Service) => {
    this._clearInterval(service);
    this._clearMessageListener(service);
    this.closeAuthWindow(service);
  };

  accessToken: () => ?Token = (): ?Token => this._accessToken;

  tokenExpireDate: () => ?Date = (): ?Date => {
    if (!this._accessToken) {
      return null;
    }
    return new Date(this._accessToken.expireDate);
  };

  tokenExpiresSecondsFromNow: () => ?number = (): ?number => {
    const expireDate = this.tokenExpireDate();
    if (!expireDate) {
      return null;
    }
    const seconds = expireDate - new Date();
    if (seconds < 0) {
      return null;
    }
    return Math.floor(seconds / 1000);
  };

  refreshToken: (refreshToken: string) => Promise<?Token> = (
    refreshToken: string,
  ): Promise<?Token> => {
    return exchangeRefreshToken(
      this.oneGraphOrigin,
      this.appId,
      refreshToken,
    ).then((response) => {
      if (!response) {
        throw new OAuthError({
          error: 'invalid_grant',
          error_description: 'Invalid response refreshing token.',
        });
      }
      if (response.error) {
        throw new OAuthError({
          error: response.error,
          error_description: response.error_description,
        });
      }
      if (
        !response.access_token ||
        !response.expires_in ||
        !response.refresh_token
      ) {
        throw new OAuthError({
          error: 'invalid_grant',
          error_description:
            'Inavlid response from server while refreshing token.',
        });
      } else {
        const token: Token = {
          accessToken: response.access_token,
          expireDate: Date.now() + response.expires_in * 1000,
          refreshToken: response.refresh_token,
        };
        this.setToken(token);
        return token;
      }
    });
  };

  authHeaders: () => {Authorization?: string, ...} = (): {
    Authorization?: string,
  } => {
    if (this._accessToken) {
      return {Authorization: `Bearer ${this._accessToken.accessToken}`};
    } else {
      return {};
    }
  };

  friendlyServiceName(service: Service): string {
    return friendlyServiceName(service);
  }

  _makeAuthUrl: ({
    scopes: ?Array<string>,
    service: Service,
    stateParam: string,
    useTestFlow: ?boolean,
    verifier: string,
    ...
  }) => Promise<string> = ({
    service,
    verifier,
    stateParam,
    scopes,
    useTestFlow,
  }: {
    service: Service,
    verifier: string,
    stateParam: string,
    scopes: ?Array<string>,
    useTestFlow: ?boolean,
  }): Promise<string> => {
    return PKCE.codeChallengeOfVerifier(verifier).then((challenge) => {
      const query: any = {
        service,
        app_id: this.appId,
        response_type: 'code',
        redirect_origin: this._redirectOrigin,
        redirect_path: this._redirectPath,
        communication_mode: this._communicationMode,
        code_challenge: challenge.challenge,
        code_challenge_method: challenge.method,
        state: stateParam,

        ...(scopes ? {scopes: scopes.join(',')} : {}),
      };
      if (useTestFlow) {
        query.test = 'true';
      }
      const authUrl = URI.make({
        origin: this.oneGraphOrigin,
        path: '/oauth/start',
        query,
      });
      return URI.toString(authUrl);
    });
  };

  setToken: (token: Token) => void = (token: Token) => {
    this._accessToken = token;
    const {refreshToken, ...storableToken} = token;
    this._storage.setItem(this._storageKey, JSON.stringify(storableToken));
  };

  _waitForAuthFinishPostMessage: (
    service: Service,
    stateParam: StateParam,
    verifier: string,
  ) => Promise<AuthResponse> = (
    service: Service,
    stateParam: StateParam,
    verifier: string,
  ): Promise<AuthResponse> => {
    return new Promise((resolve, reject) => {
      function parseEvent(event) {
        try {
          return JSON.parse(event.data);
        } catch (e) {
          return {};
        }
      }
      const listener = (event) => {
        const message = parseEvent(event);
        if (message && message.version <= 2) {
          const {code, state} = message;
          if (state !== stateParam) {
            console.warn('Invalid state param, skipping event');
          } else {
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
                verifier,
              )
                .then((response) => {
                  if (response.error) {
                    reject(new OAuthError(response));
                  } else if (
                    typeof response.access_token === 'string' &&
                    typeof response.expires_in === 'number'
                  ) {
                    const token: Token = {
                      accessToken: response.access_token,
                      expireDate: Date.now() + response.expires_in * 1000,
                      refreshToken: response.refresh_token,
                    };
                    this.setToken(token);
                    resolve({
                      token,
                      service: response.service,
                      foreignUserId: response.foreign_user_id,
                    });
                  } else {
                    reject(new Error('Unexpected result from server'));
                  }
                })
                .catch((e) => reject(e));
            }
          }
        }
      };
      this._messageListeners[service] = listener;
      window.addEventListener('message', listener, false);
    });
  };

  _waitForAuthFinishRedirect: (
    service: Service,
    stateParam: StateParam,
    verifier: string,
  ) => Promise<AuthResponse> = (
    service: Service,
    stateParam: StateParam,
    verifier: string,
  ): Promise<AuthResponse> => {
    return new Promise((resolve, reject) => {
      this._intervalIds[service] = setInterval(() => {
        try {
          const authUri = URI.safeParse(
            this._authWindows[service].location.toString(),
          );
          if (authUri && authUri.origin === this._redirectOrigin) {
            const params = authUri.query;
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
                  verifier,
                )
                  .then((response) => {
                    if (response.error) {
                      reject(new OAuthError(response));
                    } else if (
                      typeof response.access_token === 'string' &&
                      typeof response.expires_in === 'number'
                    ) {
                      const token: Token = {
                        accessToken: response.access_token,
                        expireDate: Date.now() + response.expires_in * 1000,
                        refreshToken: response.refresh_token,
                      };
                      this.setToken(token);
                      resolve({token});
                    } else {
                      reject(new Error('Unexpected result from server'));
                    }
                  })
                  .catch((e) => reject(e));
              }
            }
          }
        } catch (e) {
          if (e instanceof window.DOMException) {
            // do nothing--probably on the service's or onegraph's domain
          } else {
            console.error(
              'unexpected error waiting for auth to finish for ' + service,
              e,
            );
            reject(e);
          }
        }
      }, POLL_INTERVAL);
    });
  };

  /**
   * @throws {OAuthError}
   */
  login: (
    service: Service,
    scopes: ?Array<string>,
    useTestFlow?: ?boolean,
  ) => Promise<AuthResponse> = (
    service: Service,
    scopes: ?Array<string>,
    useTestFlow?: ?boolean,
  ): Promise<AuthResponse> => {
    if (!service) {
      throw new OAuthError({
        error: 'invalid_request',
        error_description:
          "Missing required argument. Provide service as first argument to login (e.g. `auth.login('stripe')`).",
      });
    }
    this.cleanup(service);
    const stateParam = makeStateParam();
    const verifier = PKCE.generateVerifier();
    // Create an auth window without a URL initially so that browser associates
    // window.open with the event (usually a click) that triggered login.
    // If we waited until _makeAuthUrl's promise resolved, we might trigger
    // a popup blocker
    const authWindow = createAuthWindow({service});
    this._authWindows[service] = authWindow;
    const authFinish =
      this._communicationMode === 'redirect'
        ? this._waitForAuthFinishRedirect
        : this._waitForAuthFinishPostMessage;
    const windowUrl = this._makeAuthUrl({
      service,
      verifier,
      stateParam,
      scopes,
      useTestFlow,
    });
    return windowUrl
      .then((url) => {
        try {
          authWindow.location.href = url;
        } catch (e) {
          throw new OAuthError({
            error: 'invalid_response',
            error_description: 'Popup window was closed or blocked',
          });
        }
        return authFinish(service, stateParam, verifier).then((result) => {
          this.cleanup(service);
          return result;
        });
      })
      .catch((e) => {
        this.cleanup(service);
        throw e;
      });
  };

  isLoggedIn: (
    args: Service | {foreignUserId?: ?string, service: string, ...},
  ) => Promise<boolean> = (
    args: Service | {service: string, foreignUserId?: ?string},
  ): Promise<boolean> => {
    const accessToken = this._accessToken;
    if (accessToken) {
      const service = typeof args === 'string' ? args : args.service;
      if (!service) {
        throw new Error(
          "Missing required argument. Provide service as first argument to isLoggedIn (e.g. `auth.isLoggedIn('stripe')`).",
        );
      }
      const foreignUserId =
        typeof args === 'string' ? null : args.foreignUserId;
      return fetchQuery(this._fetchUrl, loggedInQuery, {}, accessToken).then(
        (result) => getIsLoggedIn(result, service, foreignUserId),
      );
    } else {
      return Promise.resolve(false);
    }
  };

  servicesStatus: () => Promise<ServicesStatus> =
    (): Promise<ServicesStatus> => {
      const accessToken = this._accessToken;
      if (accessToken) {
        return fetchQuery(this._fetchUrl, loggedInQuery, {}, accessToken).then(
          (result) =>
            ALL_SERVICES.reduce((acc, service) => {
              acc[service] = {isLoggedIn: getIsLoggedIn(result, service)};
              return acc;
            }, {}),
        );
      } else {
        return Promise.resolve(
          ALL_SERVICES.reduce((acc, service) => {
            acc[service] = {isLoggedIn: false};
            return acc;
          }, {}),
        );
      }
    };

  allServices: () => Promise<ServicesList> = (): Promise<ServicesList> => {
    return fetchQuery(this._fetchUrl, allServicesQuery, {}, null).then(
      (result) => {
        return result.data.oneGraph.services.map((serviceInfo) => ({
          serviceEnum: serviceInfo.service,
          service: fromServiceEnum(serviceInfo.service),
          friendlyServiceName: serviceInfo.friendlyServiceName,
          supportsTestFlow: serviceInfo.supportsTestFlow,
        }));
      },
    );
  };

  loggedInServices: () => Promise<LoggedInServices> =
    (): Promise<LoggedInServices> => {
      const accessToken = this._accessToken;
      if (accessToken) {
        return fetchQuery(this._fetchUrl, loggedInQuery, {}, accessToken).then(
          (result) => {
            const loggedInServices =
              idx(result, (_) => _.data.me.serviceMetadata.loggedInServices) ||
              [];
            return loggedInServices.reduce((acc, serviceInfo) => {
              const serviceKey = fromServiceEnum(serviceInfo.service);
              const loggedInInfo = acc[serviceKey] || {
                serviceEnum: serviceInfo.service,
                foreignUserIds: [],
              };
              acc[serviceKey] = {
                ...loggedInInfo,
                usedTestFlow: serviceInfo.usedTestFlow,
                foreignUserIds: [
                  serviceInfo.foreignUserId,
                  ...loggedInInfo.foreignUserIds,
                ],
              };
              return acc;
            }, {});
          },
        );
      } else {
        return Promise.resolve({});
      }
    };

  logout: (service: Service, foreignUserId?: ?string) => Promise<LogoutResult> =
    (service: Service, foreignUserId?: ?string): Promise<LogoutResult> => {
      if (!service) {
        throw new Error(
          "Missing required argument. Provide service as first argument to logout (e.g. `auth.logout('stripe')`).",
        );
      }
      this.cleanup(service);
      const accessToken = this._accessToken;
      if (accessToken) {
        const serviceEnum = getServiceEnum(service);

        const signoutPromise = foreignUserId
          ? fetchQuery(
              this._fetchUrl,
              logoutUserMutation,
              {
                service: serviceEnum,
                foreignUserId: foreignUserId,
              },
              accessToken,
            )
          : fetchQuery(
              this._fetchUrl,
              logoutMutation,
              {
                services: [serviceEnum],
              },
              accessToken,
            );
        return signoutPromise.then((result) => {
          if (
            result.errors &&
            result.errors.length &&
            getServiceErrors(result.errors).length
          ) {
            return {result: 'failure', errors: result.errors};
          } else {
            const loggedIn = getIsLoggedIn(
              {data: result.signoutServices},
              service,
              foreignUserId,
            );
            return {result: loggedIn ? 'failure' : 'success'};
          }
        });
      } else {
        return Promise.resolve({result: 'failure'});
      }
    };

  destroy: () => void = () => {
    Object.keys(this._intervalIds).forEach((key) => this.cleanup(key));
    Object.keys(this._authWindows).forEach((key) => this.cleanup(key));
    this._storage.removeItem(this._storageKey);
    this._accessToken = null;
  };

  findMissingAuthServices: any = findMissingAuthServices;
}

export default OneGraphAuth;
