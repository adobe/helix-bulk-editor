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
import Breadcrumbs from '@react/react-spectrum/Breadcrumbs';
import { TableView } from '@react/react-spectrum/TableView';
import Folder from '@react/react-spectrum/Icon/Folder';
import Dialog from '@react/react-spectrum/Dialog';
import PropTypes from 'prop-types';
import FolderListDataSource from './FolderListDataSource';

export default class PathBrowser extends React.Component {
  static get propTypes() {
    return {
      /**
       * Callback when dialog closes
       */
      onClose: PropTypes.func,

      /**
       * Callback when cancel button clicked
       */
      onCancel: PropTypes.func,

      /**
       * Callback when confirm button clicked.
       */
      onConfirm: PropTypes.func,

      /**
       * Title of the dialog
       */
      title: PropTypes.node,

      /**
       * Root folder of the path browser
       */
      rootFolder: PropTypes.string,
    };
  }

  constructor(props) {
    super(props);

    this.ds = new FolderListDataSource(undefined, this.props.app);
    this.state = {
      rootFolder: '',
      crumbs: [],
    };
  }

  componentDidMount() {
    this.setState({
      rootFolder: this.props.rootFolder,
      crumbs: [{
        label: '/',
        itemPath: this.props.rootFolder,
      }],
    });
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.rootFolder !== prevState.rootFolder) {
      this.ds.setRoot(this.state.rootFolder);
      // eslint-disable-next-line no-console
      console.log('load folder', this.state.rootFolder);
    }
  }

  loadFolder(name, itemPath) {
    const { crumbs } = this.state;
    const idx = crumbs.findIndex((i) => (i.itemPath === itemPath));
    if (idx >= 0) {
      crumbs.splice(idx + 1, crumbs.length - idx);
    } else {
      crumbs.push({
        label: name,
        itemPath,
      });
    }
    this.setState({
      rootFolder: itemPath,
      crumbs,
    });
  }

  handleCellClick(col, idx) {
    const row = this.ds.getItem(0, idx);
    this.loadFolder(row.name, row.itemPath);
  }

  handleBreadClick(item) {
    this.loadFolder(item.label, item.itemPath);
  }

  handleConfirm() {
    if (this.props.onConfirm) {
      const relPath = this.state.crumbs.map((c) => c.name).join('/');
      this.props.onConfirm({
        relPath,
        itemPath: this.state.rootFolder,
      });
    }
  }

  render() {
    const columns = [{
      title: 'Name',
      key: 'name',
      minWidth: 400,
      sortable: false,
    },
    ];

    function renderCell(column, data) {
      return <span className="folder-list-item">{data[column.key]}</span>;
    }

    return (
      <Dialog
        title={this.props.title}
        confirmLabel="OK"
        cancelLabel="Cancel"
        onClose={this.props.onClose}
        onConfirm={this.handleConfirm.bind(this)}
        onCancel={this.props.onCancel}
      >
        <Breadcrumbs
          icon={<Folder />}
          items={this.state.crumbs}
          onBreadcrumbClick={this.handleBreadClick.bind(this)}
        />

        <TableView
          className="folder-list"
          dataSource={this.ds}
          columns={columns}
          renderCell={renderCell}
          allowsSelection={false}
          onCellClick={this.handleCellClick.bind(this)}
        />
      </Dialog>
    );
  }
}
