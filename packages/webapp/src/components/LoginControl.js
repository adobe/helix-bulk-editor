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
import IllustratedMessage from '@react/react-spectrum/IllustratedMessage';
import Box from '@react/react-spectrum/Icon/Box';

export default class LoginControl extends React.Component {
  constructor(props) {
    super(props);
    this.handleLoginClick = this.handleLoginClick.bind(this);
  }

  handleLoginClick() {
    this.props.app.props.onSignIn();
  }

  render() {
    return (
      <>
        <IllustratedMessage
          heading="Not Logged In"
          description="Please sign in to OneDrive first."
          illustration={<Box size="XL"/>}
        />
        <p/>
        <Button onClick={this.handleLoginClick}>Sign In</Button>
      </>
    );
  }
}
