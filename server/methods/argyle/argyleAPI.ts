import axios from 'axios';
import { Meteor } from 'meteor/meteor';
import logger from '../../logger/log';
import * as Sentry from '@sentry/node';

import { ARGYLE_API_KEY, ARGYLE_API_SECRET, ARGYLE_URL } from '../../keys';

const AUTH_PARAMS = {
  username: ARGYLE_API_KEY,
  password: ARGYLE_API_SECRET
};

interface ArgyleConnection {
  status: string;
  errorCode: null | string;
  errorMessage: null | string;
  updatedAt: Date;
}
interface ArgylePaystubs {
  status: string;
  updated_at: string;
  available_count: number;
  available_from: string;
  available_to: string;
}
interface ArgyleAccount {
  created_at: string;
  updated_at: string;
  scanned_at: string;
  source: string;
  employers: [string];
  id: string;
  item: string;
  connection: ArgyleConnection;
  availability: {
    paystubs: ArgylePaystubs;
  };
}

interface IArgyleUserToken {
  user_token: string;
  id: string;
}

async function getAccount(accountId: string): Promise<ArgyleAccount> {
  const { data } = await axios.get<ArgyleAccount>(`${ARGYLE_URL}/accounts/${accountId}`, { auth: AUTH_PARAMS });
  return data;
}

async function createReport(argyleUserId: string): Promise<Meteor.ArgyleReports> {
  if (!argyleUserId) {
    logger.error('argyleUserId is undefined');
    Sentry.captureException('argyleUserId is undefined');
    throw new Meteor.Error('argyleUserId is undefined');
  }

  try {
    const { data } = await axios.post<Meteor.ArgyleReports>(
      `${ARGYLE_URL}/reports`,
      {
        user: argyleUserId,
        type: 'voie'
      },
      { auth: AUTH_PARAMS }
    );
    return data;
  } catch (error) {
    logger.error(`Error argyleUserId: ${argyleUserId}`);
    Sentry.captureException(`Error argyleUserId: ${argyleUserId}`);
    throw new Meteor.Error('Error');
  }
}

async function createUser(): Promise<IArgyleUserToken> {
  const { data } = await axios.post<IArgyleUserToken>(`${ARGYLE_URL}/users`, {}, { auth: AUTH_PARAMS });
  return data;
}

async function createUserToken(userId: string): Promise<{ user_token: string }> {
  const response = await axios.post(`${ARGYLE_URL}/user-tokens`, { user: userId }, { auth: AUTH_PARAMS });
  return response.data as { user_token: string };
}

async function getReport(reportId: string): Promise<Meteor.ArgyleReports> {
  const { data } = await axios.get<Meteor.ArgyleReports>(`${ARGYLE_URL}/reports/${reportId}`, { auth: AUTH_PARAMS });
  return data;
}

export default {
  getAccount,
  createReport,
  createUser,
  createUserToken,
  getReport
};
