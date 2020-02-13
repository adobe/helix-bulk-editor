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
import Textfield from '@react/react-spectrum/Textfield';

import Button from '@react/react-spectrum/Button';
import Rule from '@react/react-spectrum/Rule';
import { TableView } from '@react/react-spectrum/TableView';
import PropTypes from 'prop-types';
import FolderListDataSource from './FolderListDataSource';

import { GRAPH_REQUESTS } from '../auth-utils';
import api from '../api';

export default class Navigator extends React.Component {
  constructor(props) {
    super(props);

    const { params } = this.props.match;

    this.state = {
      someResult: {},
      rootFolder: decodeURIComponent(params.rootFolder || ''),
      folderDataSource: new FolderListDataSource(undefined, this.props.app),
    };
    this.loadUserInfo = this.loadUserInfo.bind(this);
    this.loadFolder = this.loadFolder.bind(this);
  }

  async loadUserInfo() {
    const tokenResponse = await this.props.app.props.acquireToken(
      GRAPH_REQUESTS.LOGIN,
    );
    if (!tokenResponse) {
      return;
    }
    const ret = await fetch(api.me(), {
      headers: {
        'x-ms-access-token': tokenResponse.accessToken,
        // Authorization: `Bearer ${tokenResponse.accessToken}`,
      },
    });
    const userInfo = await ret.json();
    // eslint-disable-next-line no-console
    console.log(await userInfo);
    this.setState({
      someResult: userInfo,
    });
  }

  async loadFolder() {
    const ds = this.state.folderDataSource;
    ds.setRoot(this.state.rootFolder);
    // eslint-disable-next-line no-console
    console.log('load folder', this.state.rootFolder);
  }

  static get propTypes() {
    return {
      runtime: PropTypes.any,
    };
  }

  handleEnterCell(col, idx) {
    const row = this.state.folderDataSource.sections[0][idx];
    this.setState({
      rootFolder: row.itemId,
    });
    this.props.history.push(`/${encodeURIComponent(row.itemId)}`);
    this.loadFolder();
  }


  render() {
    const columns = [
      {
        title: 'Name',
        key: 'name',
        width: 150,
        sortable: false,
        divider: true,
      },
      {
        title: 'Item Id',
        key: 'itemId',
        minWidth: 200,
        sortable: false,
        announce: false,
      },
    ];

    function renderCell(column, data) {
      return <span className="folder-list-item">{data[column.key]}</span>;
    }

    return (
      <>
        <div style={{ textAlign: 'center' }}>
          <div>
            <Textfield className="share-link" id="rootFolder" name="rootFolder"
                       placeholder="Root Folder or OneDrive Share Link"
                       onChange={(value) => this.setState({ rootFolder: value })}
                       value={this.state.rootFolder}
            />
            <Button onClick={this.loadFolder} variant="primary">Load</Button>
            <p>
              <em>eg: https://adobe.sharepoint.com/sites/TheBlog/Shared%20Documents/theblog</em>
            </p>
          </div>
        </div>
        <div>
          <Button onClick={this.loadUserInfo}>Fetch User Info</Button>
          <Rule variant="medium" />
          <pre>{JSON.stringify(this.state.someResult, null, 2)}</pre>
          <TableView
            className="folder-list"
            dataSource={this.state.folderDataSource}
            columns={columns}
            renderCell={renderCell}
            allowsSelection={false}
            onCellDoubleClick={this.handleEnterCell.bind(this)}
          />
        </div>
      </>
    );
  }
}
