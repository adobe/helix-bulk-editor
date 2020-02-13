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
import {
  Route, Switch, Link,
} from 'react-router-dom';
import Well from '@react/react-spectrum/Well';
import LoginControl from './LoginControl';
import Export from './Export';
import Import from './Import';

export default class BulkEditor extends React.Component {
  render() {
    return (
      <div className="bulkeditor">
        <p/>
        {!this.props.app.props.account
        && <div style={{ textAlign: 'center' }}>
          <LoginControl app={this.props.app}/>
        </div>
        }
        {this.props.app.props.account
        && <>
          <Switch>
            <Route path="/export" render={(props) => <Export {...props} app={this.props.app}/>}/>
            <Route path="/import" render={(props) => <Import {...props} app={this.props.app}/>}/>
            <Route path="/">
              <Well>
                <p>
                  <Link className='spectrum-Link' to="/export">Export CSV Table</Link>
                </p>
                <p>
                  <Link className='spectrum-Link' to="/import">Import CSV Table</Link>
                </p>
              </Well>
            </Route>
          </Switch>
        </>
        }
      </div>
    );
  }
}
