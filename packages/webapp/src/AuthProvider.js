/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
import React, { Component } from 'react';
import {
  msalApp,
  requiresInteraction,
  fetchMsGraph,
  isIE,
  GRAPH_ENDPOINTS,
  GRAPH_REQUESTS,
} from './auth-utils';

// If you support IE, our recommendation is that you sign-in using Redirect APIs
const useRedirectFlow = isIE();
// const useRedirectFlow = true;

export default (C) => class AuthProvider extends Component {
  constructor(props) {
    super(props);

    this.state = {
      account: null,
      error: null,
      graphProfile: null,
    };
  }

  // eslint-disable-next-line class-methods-use-this
  async acquireToken(request, redirect) {
    return msalApp.acquireTokenSilent(request).catch((error) => {
      // Call acquireTokenPopup (popup window) in case of acquireTokenSilent failure
      // due to consent or interaction required ONLY
      if (requiresInteraction(error.errorCode)) {
        return redirect
          ? msalApp.acquireTokenRedirect(request)
          : msalApp.acquireTokenPopup(request);
      } else {
        throw Error(`Non-interactive error: ${error.errorCode}`);
      }
    });
  }

  // eslint-disable-next-line consistent-return
  async onSignIn(redirect) {
    if (redirect) {
      return msalApp.loginRedirect(GRAPH_REQUESTS.LOGIN);
    }

    const loginResponse = await msalApp
      .loginPopup(GRAPH_REQUESTS.LOGIN)
      .catch((error) => {
        this.setState({
          error: error.message,
        });
      });

    if (loginResponse) {
      this.setState({
        account: loginResponse.account,
        error: null,
      });

      const tokenResponse = await this.acquireToken(
        GRAPH_REQUESTS.LOGIN,
      ).catch((error) => {
        this.setState({
          error: error.message,
        });
      });

      if (tokenResponse) {
        const graphProfile = await fetchMsGraph(
          GRAPH_ENDPOINTS.ME,
          tokenResponse.accessToken,
        ).catch(() => {
          this.setState({
            error: 'Unable to fetch Graph profile.',
          });
        });

        if (graphProfile) {
          this.setState({
            graphProfile,
          });
        }
      }
    }
  }

  // eslint-disable-next-line class-methods-use-this
  onSignOut() {
    msalApp.logout();
  }

  async componentDidMount() {
    msalApp.handleRedirectCallback((error) => {
      if (error) {
        const errorMessage = error.errorMessage ? error.errorMessage : 'Unable to acquire access token.';
        // setState works as long as navigateToLoginRequestUrl: false
        this.setState({
          error: errorMessage,
        });
      }
    });

    const account = msalApp.getAccount();

    this.setState({
      account,
    });
  }

  render() {
    return (
        <C
          {...this.props}
          account={this.state.account}
          error={this.state.error}
          graphProfile={this.state.graphProfile}
          onSignIn={() => this.onSignIn(useRedirectFlow)}
          onSignOut={() => this.onSignOut()}
          acquireToken={(request) => this.acquireToken(request, useRedirectFlow)}
        />
    );
  }
};
