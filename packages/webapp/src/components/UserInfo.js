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

import Button from '@react/react-spectrum/Button';
import Well from '@react/react-spectrum/Well';

export default class MyApps extends React.Component {
  render() {
    return (
      <Well>
        <div>{this.props.me.name} ({this.props.me.userName})</div>
        <Button onClick={this.props.app.props.onSignOut}>Sign Out</Button>
      </Well>
    );
  }
}
