//@flow

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
};

export type AuthResponse = void; // TODO: proper auth response
export type LogoutResult = {
  result: 'success' | 'failure',
};

type Window = any;

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
  authUrl: string,
  service: Service,
  friendlyServiceName: string,
): Window {
  const windowOpts = getWindowOpts();
  return window.open(
    authUrl,
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
  return u.pathname;
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
      throw new Error('No such service');
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
      throw new Error('No such service');
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

function fetchQuery(fetchUrl: string, query: string): Promise<Object> {
  return fetch(fetchUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      show_beta_schema: true,
    },
    credentials: 'include',
    body: JSON.stringify({query}),
  }).then(response => response.json());
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

  constructor(opts: Opts) {
    const {service, appId, oauthFinishOrigin, oauthFinishPath} = opts;
    this.service = service;
    this.friendlyServiceName = friendlyServiceName(this.service);
    const authUrl = new URL(opts.oneGraphOrigin || DEFAULT_ONEGRAPH_ORIGIN);
    authUrl.pathname = '/oauth/start';
    authUrl.searchParams.set('service', service);
    authUrl.searchParams.set('app_id', appId);
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
    // remove leading slash
    authUrl.searchParams.set('redirect_path', this._redirectPath.substr(1));

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

  _waitForAuthFinish = (): Promise<AuthResponse> => {
    return new Promise((resolve, reject) => {
      this._intervalId = setInterval(() => {
        try {
          const authLocation = this._authWindow.location;
          if (authLocation.origin === this._redirectOrigin) {
            this.cleanup();
            resolve();
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
    this._authWindow = createAuthWindow(
      this._authUrl,
      this.service,
      this.friendlyServiceName,
    );
    return this._waitForAuthFinish();
  };

  isLoggedIn = (): Promise<boolean> => {
    return fetchQuery(this._fetchUrl, loggedInQuery(this.service)).then(
      result => getIsLoggedIn(result, this.service),
    );
  };

  logout = (): Promise<LogoutResult> => {
    this.cleanup();
    return fetchQuery(this._fetchUrl, logoutMutation(this.service)).then(
      result => {
        const loggedIn = getIsLoggedIn(
          {data: result.signoutServices},
          this.service,
        );
        return {result: loggedIn ? 'failure' : 'success'};
      },
    );
  };
}

export default OneGraphAuth;
