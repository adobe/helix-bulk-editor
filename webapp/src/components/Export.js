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
import React from 'react'
import Textfield from '@react/react-spectrum/Textfield'
import Button from '@react/react-spectrum/Button'
import ModalTrigger from '@react/react-spectrum/ModalTrigger'
import { Table, TD, TH, TR, TBody } from '@react/react-spectrum/Table';
import Wait from '@react/react-spectrum/Wait';
import csvStringify from 'csv-stringify/lib/sync';
import PathBrowser from './PathBrowser'

import api from '../api';

export default class Export extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      rootFolder: '',
      table: [],
      tableLoading: false,
    };
  }

  handleSelectFolder(folder) {
    this.setState({
      rootFolder: folder.itemPath,
    })
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
      const ret = await fetch(`${api.base}/api/extract?root=${encodeURIComponent(this.state.rootFolder)}`, {
        headers: {
          'x-ms-access-token': tokenResponse.accessToken,
          // Authorization: `Bearer ${tokenResponse.accessToken}`,
        },
      });
      const table = await ret.json();
      console.log(table);
      this.setState({
        table,
      })
    } finally {
      this.setState({
        tableLoading: false,
      })
    }
  }

  handleCSVClick() {
    const a = window.document.createElement('a');
    const csv = csvStringify(this.state.table, { header: true });
    a.href = window.URL.createObjectURL(new Blob([csv], {type: 'text/csv'}));
    a.download = 'helix-bulk-export.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  renderTable() {
    const { table } = this.state;
    return table.map((row, rowIdx) => {
      if (rowIdx === 0) {
        return <TR key={rowIdx}>{row.map((item, idx) => (<TH key={idx}>{item}</TH>))}</TR>;
      } else {
        return <TR key={rowIdx}>{row.map((item, idx) => (<TD key={idx}>{item}</TD>))}</TR>;
      }
    });
  }

  render() {
    const enableExtract = () => (this.state.rootFolder && this.state.rootFolder.startsWith('/'));
    const copyDefault = () => { this.setState({ rootFolder: 'https://adobe.sharepoint.com/sites/TheBlog/Shared%20Documents/theblog' })};

    return (
      <>
        <div style={{textAlign: 'center'}}>
          <div>
            <Textfield className="share-link" id="rootFolder" name="rootFolder"
                       placeholder="Root Folder or OneDrive Share Link"
                       onChange={(value) => this.setState({'rootFolder': value})}
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
              <em>eg: <span onClick={copyDefault}>https://adobe.sharepoint.com/sites/TheBlog/Shared%20Documents/theblog</span></em>
            </p>
          </div>
        </div>
        <div className="csv-preview">
          {this.state.tableLoading && <Wait className="csv-preview-spinner" />}
          <Table>
            <TBody>{this.renderTable()}</TBody>
          </Table>
        </div>
      </>
    )
  }
}
