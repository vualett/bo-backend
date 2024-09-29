/* eslint-disable camelcase */
import { Meteor } from 'meteor/meteor';
import plaidClient from '../../../../server/plaid/plaid';
import logger from '../../../../server/logger/log';
import Security from '../../../../server/utils/security';
import * as Sentry from '@sentry/node';
import changeStage from '../../../../server/methods/users/changeStage';
import { STAGE } from '../../../../server/consts/user';
const products = ['auth', 'assets'];

async function itemPublicTokenExchange(publicToken) {
  try {
    const response = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken
    });
    return response.data.access_token;
  } catch (error) {
    logger.error(error);
    throw error;
  }
}

async function getAccounts(publicToken) {
  const accessToken = await itemPublicTokenExchange(publicToken);

  const request = {
    access_token: accessToken
  };

  const { data } = await plaidClient.accountsGet(request);

  return data.accounts.filter((a) => a.subtype === 'checking')[0];
}

async function createItem(userID) {
  this.unblock();
  Security.checkIfAdmin(Meteor.userId());

  try {
    const request = {
      institution_id: 'ins_127991',
      initial_products: products
    };

    const public_token = await plaidClient.sandboxPublicTokenCreate(request).then((res) => res.data.public_token);

    const account = await getAccounts(public_token);

    const item = {
      public_token,
      institution: { institution_id: 'ins_127991', name: 'Wells Fargo' },
      account: { ...account, id: account.account_id }
    };

    Meteor.call('users.addBankAccount', item, userID, (e) => e && logger.error(e));

    const _user = await Meteor.users.findOneAsync({
      _id: userID,
      'offStage.stage': STAGE.ONBOARDING.STAGE_3
    });

    if (_user) {
      await changeStage({
        userId: userID,
        stage: STAGE.UNDERWRITING.STAGE_4
      });
    }

    return true;
  } catch (error) {
    Sentry.captureException(error, { extra: userID });
    logger.error(`_dev.users.plaid.createItem[ ${userID}]${error}`);

    throw error;
  }
}

Meteor.methods({ '_dev.users.plaid.createItem': createItem });
