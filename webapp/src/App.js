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
import React from 'react';
import ErrorBoundary from 'react-error-boundary';
import Provider from '@react/react-spectrum/Provider';
import Alert from '@react/react-spectrum/Alert';
import Button from '@react/react-spectrum/Button';
import {
  Shell, ShellHeader, ShellContent, ShellActions,
} from '@react/react-spectrum/Shell';

import AdobeExperienceManager from '@react/react-spectrum/Icon/AdobeExperienceManager';
import User from '@react/react-spectrum/Icon/User';

import PropTypes from 'prop-types';
import { Route, Switch, Link } from 'react-router-dom';
import AuthProvider from './AuthProvider';
import Export from './components/Export';
import Import from './components/Import';
// import helixLogo from './assets/helix_logo.png';

import './App.css';

class App extends React.Component {
  static get propTypes() {
    return {
      account: PropTypes.object,
      error: PropTypes.string,
      onSignIn: PropTypes.func.isRequired,
      onSignOut: PropTypes.func.isRequired,
      acquireToken: PropTypes.func.isRequired,
      runtime: PropTypes.any,
    };
  }

  constructor(props) {
    super(props);

    // error handler on UI rendering failure
    this.onError = (error, componentStack) => <Alert header="Error" closeLabel="Close"
                                                     variant="error">
      <pre>{`${componentStack}\n${error.message}`}</pre>
    </Alert>;

    // component to show if UI fails rendering
    this.fallbackComponent = ({ componentStack, error }) => (
      <Alert header="Error" closeLabel="Close" variant="error">
        <h1 style={{ textAlign: 'center', marginTop: '20px' }}>Something went wrong :(</h1>
        <pre>{`${componentStack}\n${error.message}`}</pre>
      </Alert>
    );

    this.state = {
      someResult: {},
    };
  }

  render() {
    return (
      <Provider className={'App'} theme="light">
        <ErrorBoundary onError={this.onError} FallbackComponent={this.fallbackComponent}>
          <Shell>
            <ShellHeader homeIcon={<AdobeExperienceManager/>} homeTitle="Helix Bulk Editor">
              <ShellActions>
                <Button variant="minimal" className="coral-Shell-menu-button" icon={<User/>}
                        square>{this.props.account && this.props.account.userName}</Button>
                {this.props.account && <Button onClick={this.props.onSignOut}>Sign Out</Button>}
              </ShellActions>
            </ShellHeader>
            <ShellContent>
              <div style={{ textAlign: 'center' }}>
                <p/>
              </div>
              {this.props.account
              && <>
                <Switch>
                  <Route path="/export" render={(props) => <Export {...props} app={this}/>}/>
                  <Route path="/import" render={(props) => <Import {...props} app={this}/>}/>
                  <Route path="/">
                    <p>
                      <Link className='spectrum-Link' to="/export">Export CSV Table</Link>
                    </p>
                    <p>
                      <Link className='spectrum-Link' to="/import">Import CSV Table</Link>
                    </p>
                  </Route>
                </Switch>
              </>
              }

            </ShellContent>
          </Shell>
        </ErrorBoundary>
      </Provider>
    );
  }
}

export default AuthProvider(App);
