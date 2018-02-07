//@flow

import React from 'react';
import './css/stripe-connect.css';
import {OneGraphAuth} from 'onegraph-auth';

import type {AuthResponse} from 'onegraph-auth';

type Props = {
  appId: string,
  oneGraphOrigin: string,
  oauthFinishPath: string,
  oauthFinishOrigin: string,
  onAuthResponse?: (response: AuthResponse) => void,
  oneGraphAuth?: OneGraphAuth,
};

const DEFAULT_ONE_GRAPH_URL = 'https://serve.onegraph.com';

class OneGraphStripeConnect extends React.Component<Props> {
  _oneGraphAuth: OneGraphAuth;

  static defaultProps = {
    oneGraphOrigin: DEFAULT_ONE_GRAPH_URL,
    oauthFinishPath: window.location.pathname,
    oauthFinishOrigin: window.location.origin,
  };

  constructor(props: Props) {
    const {appId, oneGraphOrigin, oauthFinishPath, oauthFinishOrigin} = props;
    if (!appId) {
      throw new Error(
        'OneGraphStripeConnect requires `appId` to be passed as a prop',
      );
    }
    super(props);
    this._oneGraphAuth =
      this.props.oneGraphAuth ||
      new OneGraphAuth({
        oneGraphOrigin,
        appId,
        service: 'stripe',
        oauthFinishOrigin,
        oauthFinishPath,
      });
  }

  _onAuthClick = (): Promise<AuthResponse> => {
    const {onAuthResponse} = this.props;
    return this._oneGraphAuth.login().then(response => {
      onAuthResponse && onAuthResponse(response);
      return response;
    });
  };

  componentWillUnmount() {
    this._oneGraphAuth.cleanup();
  }

  render() {
    return (
      <button className="stripe-connect" onClick={this._onAuthClick}>
        <span>Connect with Stripe</span>
      </button>
    );
  }
}

export default OneGraphStripeConnect;
