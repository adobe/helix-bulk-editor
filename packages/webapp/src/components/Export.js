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
import ModalTrigger from '@react/react-spectrum/ModalTrigger';
import Wait from '@react/react-spectrum/Wait';
import csvStringify from 'csv-stringify/lib/sync';
import { TableView } from '@react/react-spectrum/TableView';
import PathBrowser from './PathBrowser';
import TableDataSource from './TableDataSource';

import api from '../api';

const DEFAULT_SHARE_ROOT = 'https://adobe.sharepoint.com/sites/TheBlog/Shared%20Documents';

export default class Export extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      rootFolder: '',
      table: [],
      tableColumns: [],
      tableLoading: false,
    };

    this.ds = new TableDataSource([[]]);
  }

  handleSelectFolder(folder) {
    this.setState({
      rootFolder: folder.itemPath,
    });
  }

  async handleExtractClick() {
    const tokenResponse = await this.props.app.props.acquireToken({
      scopes: ['files.read'],
    });
    if (!tokenResponse) {
      return;
    }
    try {
      this.setState({
        tableLoading: true,
      });
      const ret = await fetch(api.extract(this.state.rootFolder), {
        headers: {
          'x-ms-access-token': tokenResponse.accessToken,
          // Authorization: `Bearer ${tokenResponse.accessToken}`,
        },
      });
      const table = await ret.json();
      this.ds.setData(table);
      // eslint-disable-next-line no-console
      console.log(table);

      const tableColumns = [{
        key: 'path',
        title: 'Path',
        maxWidth: 200,
      }, {
        key: 'name',
        title: 'Name',
      }];
      Object.keys(table[0]).forEach((key) => {
        if (['itemPath', 'path'].indexOf(key) < 0) {
          tableColumns.push({
            key,
            title: key,
          });
        }
      });

      this.setState({
        table,
        tableColumns,
      });
    } finally {
      this.setState({
        tableLoading: false,
      });
    }
  }

  handleCSVClick() {
    const a = window.document.createElement('a');
    const csv = csvStringify(this.state.table, { header: true });
    a.href = window.URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'helix-bulk-export.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  render() {
    function renderCell(column, data) {
      const { key } = column;
      let value = data[key] || '';
      if (key === 'name') {
        value = data.path || '';
        value = value.substring(value.lastIndexOf('/') + 1);
      } else if (key === 'path') {
        const idx = value.lastIndexOf('/');
        value = idx < 0 ? '' : value.substring(0, idx);
      }
      return <span className="import-table-item">{value}</span>;
    }

    const enableExtract = () => (this.state.rootFolder && this.state.rootFolder.startsWith('/'));
    const copyDefault = () => (this.setState({ rootFolder: DEFAULT_SHARE_ROOT }));

    return (
      <>
        <div style={{ textAlign: 'center' }}>
          <div>
            <Textfield className="share-link" id="rootFolder" name="rootFolder"
                       placeholder="Root Folder or OneDrive Share Link"
                       onChange={(value) => this.setState({ rootFolder: value })}
                       value={this.state.rootFolder}
            />

            <ModalTrigger>
              <Button disabled={!this.state.rootFolder} label="Browse" variant="primary" />
              <PathBrowser
                rootFolder={this.state.rootFolder}
                app={this.props.app}
                title="Select Folder"
                onConfirm={this.handleSelectFolder.bind(this)}
              />
            </ModalTrigger>
            <Button disabled={!enableExtract()} onClick={this.handleExtractClick.bind(this)} label="Extract" variant="primary" />
            <Button disabled={!this.state.table.length} onClick={this.handleCSVClick.bind(this)} label="Get CSV" variant="primary" />
            <p>
              <em>eg: <span onClick={copyDefault}>{DEFAULT_SHARE_ROOT}</span></em>
            </p>
          </div>
          <div className="csv-preview">
            {this.state.tableLoading && <Wait />}
            <TableView
              className="import-table"
              dataSource={this.ds}
              columns={this.state.tableColumns}
              renderCell={renderCell}
              allowsSelection={false}
            />
          </div>
        </div>
      </>
    );
  }
}
