import React from 'react';
import './css/stripe-connect.css';

const windowWidth = Math.min(800, Math.floor(window.outerWidth * 0.8));
const windowHeight = Math.min(630, Math.floor(window.outerHeight * 0.5));
const windowArea = {
  width: windowWidth,
  height: windowHeight,
  left: Math.round(window.screenX + (window.outerWidth - windowWidth) / 2),
  top: Math.round(window.screenY + (window.outerHeight - windowHeight) / 8),
};

// TODO: figure out how to show the toolbar icons in the window for password managers
const windowOpts = {
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

const POLL_INTERVAL = 35;
const DEFAULT_ONE_GRAPH_URL = 'https://serve.onegraph.com';
const DEFAULT_FINISH_PATH = 'oauth/stripe/finish';

class OneGraphStripeConnect extends React.Component {
  // Leaving for documentation purposes, but don't want to
  // require the proptypes dependency
  // static propTypes = {
  //   applicationId: Proptypes.string.isRequired,
  //   oneGraphUrl: Proptypes.string.isRequired,
  //   oauthFinishPath: Proptypes.string.isRequired,
  // };

  static defaultProps = {
    oneGraphUrl: DEFAULT_ONE_GRAPH_URL,
    oauthFinishPath: DEFAULT_FINISH_PATH,
  };

  _authWindow;

  _intervalId;

  constructor(props) {
    if (!props.applicationId) {
      throw new Error(
        'OneGraphStripeConnect requires `applicationId` to be passed as a prop'
      );
    }
    super(props);
  }

  _clear = () => {
    clearInterval(this._intervalId);
    this._authWindow && this._authWindow.close();
  };

  _waitForAuthFinish = () => {
    this._intervalId = setInterval(() => {
      try {
        const authLocation = this._authWindow.location;
        if (document.location.host === authLocation.host) {
          if (authLocation.pathname === '/' + this.props.oauthFinishPath) {
            this._clear();
            this.props.onAuthGranted();
          }
        }
      } catch (e) {
        if (e instanceof DOMException) {
          // do nothing--probably on the Stripe domain
        } else {
          console.error('unexpected error waiting for auth to finish', e);
          this._clear();
        }
      }
    }, POLL_INTERVAL);
  };

  _onAuthClick = () => {
    const authUrl = new URL(this.props.oneGraphUrl);
    authUrl.pathname = '/oauth/start';
    authUrl.searchParams.set('service', 'stripe');
    authUrl.searchParams.set('app_id', this.props.applicationId);
    authUrl.searchParams.set('path', this.props.oauthFinishPath);

    this._authWindow = window.open(
      authUrl,
      'oneGraphAuth',
      Object.keys(windowOpts)
        .map(k => `${k}=${windowOpts[k]}`)
        .join(',')
    );
    this._waitForAuthFinish();
  };

  componentWillUnmount() {
    this._clear();
  }

  render() {
    return (
      <button className="stripe-connect" onClick={this._onAuthClick}>
        <span>Connect with Stripe</span>
      </button>
    );
  }
}
export {OneGraphStripeConnect};
export default OneGraphStripeConnect;
