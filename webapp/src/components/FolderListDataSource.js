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

import ListDataSource from '@react/react-spectrum/ListDataSource'
import api from '../api';

export default class MyAppsDataSource extends ListDataSource {
  constructor(sections = [], app) {
    super(sections);
    this.app = app;
    this.root = '';
  }

  setRoot(value) {
    this.root = value;
    this.emit('reloadData');
  }

  async load() {
    if (!this.root) {
      return [];
    }
    // this class needs the access-token, and imsOrgId to call through to the service
    const listUrl = `${api.base}/api/list?root=${encodeURIComponent(this.root)}`;
    console.log('fetching from list : ' + listUrl);
    const tokenResponse = await this.app.props.acquireToken({
      scopes: ['files.read'],
    });
    if (!tokenResponse) {
      return [];
    }
    const response = await fetch(listUrl, {
      headers: {
        'x-ms-access-token': tokenResponse.accessToken,
        // Authorization: `Bearer ${tokenResponse.accessToken}`,
      },
    });

    if (response.ok) {
      const ret = await response.json();
      console.log('got', ret);
      return ret;
    }
    return [];
  }
}
