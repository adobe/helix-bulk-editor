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

/* eslint-disable no-console */

import { UserAgentApplication } from 'msal';
import api from './api';

export const requiresInteraction = (errorMessage) => {
  if (!errorMessage || !errorMessage.length) {
    return false;
  }

  return (
    errorMessage.indexOf('consent_required') > -1
    || errorMessage.indexOf('interaction_required') > -1
    || errorMessage.indexOf('login_required') > -1
  );
};

export const fetchMsGraph = async (url, accessToken) => {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response.json();
};

export const isIE = () => {
  const ua = window.navigator.userAgent;
  const msie = ua.indexOf('MSIE ') > -1;
  const msie11 = ua.indexOf('Trident/') > -1;
  return msie || msie11;
};

export const GRAPH_SCOPES = {
  OPENID: 'openid',
  PROFILE: 'profile',
  USER_READ: 'User.Read',
  FILE_READ: 'files.read',
  MAIL_READ: 'Mail.Read',
};

export const GRAPH_ENDPOINTS = {
  ME: 'https://graph.microsoft.com/v1.0/me',
  MAIL: 'https://graph.microsoft.com/v1.0/me/messages',
};

export const GRAPH_REQUESTS = {
  LOGIN: {
    scopes: [
      GRAPH_SCOPES.OPENID,
      GRAPH_SCOPES.PROFILE,
      GRAPH_SCOPES.USER_READ,
      GRAPH_SCOPES.FILE_READ,
    ],
  },
  EMAIL: {
    scopes: [GRAPH_SCOPES.MAIL_READ],
  },
};

export const msalApp = new UserAgentApplication({
  auth: {
    clientId: '83ab2922-5f11-4e4d-96f3-d1e0ff152856',
    authority: 'https://login.microsoftonline.com/common',
    validateAuthority: true,
    postLogoutRedirectUri: api.logoutRedirect,
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: isIE(),
  },
  system: {
    navigateFrameWait: 0,
    logger: {
      error: console.error,
      errorPii: console.error,
      info: console.log,
      infoPii: console.log,
      verbose: console.log,
      verbosePii: console.log,
      warning: console.warn,
      warningPii: console.warn,
    },
  },
});
