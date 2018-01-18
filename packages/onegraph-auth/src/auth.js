//@flow

// TODOs:
//   Should this class keep track of whether you're currently signed in?

export type Service = 'stripe' | 'google' | 'github' | 'twitter';

export type Opts = {
  oneGraphOrigin?: string,
  appId: string,
  service: Service,
  oauthFinishOrigin?: string,
  oauthFinishPath?: string,
};

type Config = {
  oneGraphAuthUrl: string,
};

export type AuthResponse = void; // TODO: proper auth response

type Window = any;

const POLL_INTERVAL = 35;

function friendlyServiceName(service: Service): string {
  switch (service) {
    case 'stripe':
      return 'Stripe';
    case 'google':
      return 'Google';
    case 'github':
      return 'GitHub';
    case 'twitter':
      return 'Twitter';
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

class OneGraphAuth {
  _authWindow: Window;
  _intervalId: ?IntervalID;
  _authUrl: string;
  service: Service;
  friendlyServiceName: string;
  _redirectOrigin: string;
  _redirectPath: string;

  constructor(opts: Opts) {
    const {service, appId, oauthFinishOrigin, oauthFinishPath} = opts;
    this.service = service;
    this.friendlyServiceName = friendlyServiceName(this.service);
    const authUrl = new URL(
      opts.oneGraphOrigin || 'https://serve.onegraph.com',
    );
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
      oauthFinishPath || window.location.path,
    );
    // remove leading slash
    authUrl.searchParams.set('redirect_path', this._redirectPath.substr(1));

    this._authUrl = authUrl.toString();
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
          if (
            authLocation.origin === this._redirectOrigin &&
            authLocation.pathname === this._redirectPath
          ) {
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

  login = async (): Promise<AuthResponse> => {
    this.cleanup();
    this._authWindow = createAuthWindow(
      this._authUrl,
      this.service,
      this.friendlyServiceName,
    );
    await this._waitForAuthFinish();
  };
}

export default OneGraphAuth;
