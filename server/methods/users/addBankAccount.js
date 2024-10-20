/* eslint-disable camelcase */
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { sendFundingSourceAdded } from '../../emails/emails';
import createAccessTokenAndUpdateUser from '../../plaid/createAccessToken';
import createAccount from '../../dwolla/createAccount';
import plaidClient from '../../plaid/plaid';
import createFundingSource from '../../dwolla/createFundingSource';
import logger from '../../logger/log';
import insertLog from '../logs/insertGenericLog';
import Security from '../../utils/security';
import createAssetReport from './plaid/createAssetReport';
import shouldClearStatus from '../../utils/shouldClearStatus';
import { markInvitationCompleted } from '../invitations/invitation';
import SupportedBanks from '../../collections/supportedBanks';
import updateBankChannels from './dwolla/updateBankChannels';
import * as Sentry from '@sentry/node';
import Dwolla from '../../../server/dwolla/dwolla';
import { STAGE, STATUS, SUB_STATUS } from '../../consts/user';
import changeStage from './changeStage';
import { setRequirementsIfNotExists, updateDocuments } from './set/setConfigMethods';
import changeSubStatus from './changeSubStatus';
import { assignAgentToUser } from './assignAgentToUsers';
import { ROLES } from '../../consts/roles';
import changeStatus from './changeStatus';

async function updateBankAccount(item) {
  Security.checkLoggedIn(Meteor.userId());
  check(item, Object);
  Meteor.users.update({ _id: Meteor.userId() }, { $set: { plaidNeedsUpdate: false } });
}

async function checkIfSupported(item, userID, by) {
  const { subtype } = item.account;
  if (subtype !== 'checking') {
    insertLog(userID, 'Tried to link a non-checking account');
    throw new Meteor.Error('NON_CHECKING_ACCOUNT', 'Must be a checking account');
  }

  const { institution_id, id, name } = item.institution;

  // workaround;
  const institutionID = institution_id || id;

  const supported = await SupportedBanks.findOneAsync({
    institution_id: institutionID
  });

  if (!supported) {
    const user = Meteor.users.findOne({ _id: userID });
    if ([STAGE.ONBOARDING.STAGE_3, STAGE.RELATIONSHIP_MANAGEMENT.STAGE_10].includes(user?.offStage?.stage)) {
      await changeStatus({
        userId: user._id,
        agentId: by || undefined,
        status: user?.offStage?.stage === STAGE.ONBOARDING.STAGE_3 ? STATUS.CUSTOMER_STUCK : STATUS.LOST
      });

      await changeSubStatus({
        userId: user._id,
        agentId: by || undefined,
        subStatus: SUB_STATUS.UNSUPPORTED_BANK
      });
    }

    insertLog(userID, `Tried to link an unsupported bank: ${name} ${institutionID.replace('+', ' ')}`);
    throw new Meteor.Error('UNSUPPORTED_BANK', 'Unsupported Bank');
  }
}

async function addBankAccount(item, userId) {
  Security.checkLoggedIn(Meteor.userId());
  const UserId = userId || Meteor.userId();
  check(item, Object);

  const plaidLinkItem = {
    publicToken: item.public_token || item.publicToken,
    account: item.account || item.accounts[0], // workaround;
    institution: item.institution,
    linkSessionId: item.linkSessionId
  };

  await checkIfSupported(plaidLinkItem, UserId, Meteor.userId());

  const user = Meteor.users.findOne({ _id: UserId });

  if (!user) throw new Meteor.Error('try again later', 'try again later');

  if (user.hasFunding === true) throw new Meteor.Error('please try again later', 'user already has funding');

  const userObj = {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.emails[user.emails.length - 1].address,
    ipAddress: this.connection.clientAddress
  };

  try {
    const CustomerURL = user.dwollaCustomerURL ? user.dwollaCustomerURL : await createAccount(UserId, userObj);

    const accessToken = await createAccessTokenAndUpdateUser(plaidLinkItem.publicToken, UserId);

    const request = {
      access_token: accessToken,
      account_id: plaidLinkItem.account.id,
      processor: 'dwolla'
    };

    const response = await plaidClient.processorTokenCreate(request);

    const { processor_token } = response.data;

    const bankAccount = {
      bankName: plaidLinkItem.institution.name,
      institution_id: plaidLinkItem.institution.institution_id || plaidLinkItem.institution.id,
      ...plaidLinkItem.account,
      dateAdded: new Date()
    };

    const dwollaFundingURL = await createFundingSource(CustomerURL, processor_token, bankAccount);

    const old_dwollaFundingURL = user.dwollaFundingURL;

    if (old_dwollaFundingURL === dwollaFundingURL) {
      logger.info(`[addBankAccount] Funding ID did not change userId ${user._id}`);
    }

    setRequirementsIfNotExists(user);

    const set = {
      hasFunding: true,
      bankAccount,
      dwollaFundingURL,
      plaidNeedsUpdate: false
    };

    if (user.dwollaFundingURL) set.old_dwollaFundingURL = user.dwollaFundingURL;

    if (shouldClearStatus(user)) {
      set['status.qualify'] = true;
      set['status.notInterested'] = false;
      set['status.unqualifiedReason'] = '';
    }

    if (old_dwollaFundingURL !== undefined && old_dwollaFundingURL !== dwollaFundingURL) {
      await Dwolla()
        .post(`${old_dwollaFundingURL}`, { removed: true })
        .then((res) => res.headers.get('location'));
    }

    set['requirements.$[elem].complete'] = true;
    await Meteor.users.updateAsync(
      { _id: UserId },
      { $set: set, $unset: { bankAccountNeedsUpdate: '' } },
      {
        arrayFilters: [{ 'elem.name': 'Bank', 'elem.complete': { $exists: true } }]
      }
    );

    // _user = the most recently updated user
    const _user = Meteor.users.findOne({ _id: UserId });

    if (_user.identityVerification?.status === 'success') {
      const hasEmailVerified = _user.emails?.find((i) => i.verified);
      if (hasEmailVerified) {
        if (_user?.offStage?.stage === STAGE.ONBOARDING.STAGE_3) {
          await changeStage({
            userId: _user._id,
            stage: STAGE.UNDERWRITING.STAGE_4
          });
          await assignAgentToUser({
            userId: _user._id,
            category: ROLES.SALES
          });
        }

        updateDocuments(_user._id, 'IDV', 'complete', true);
        updateDocuments(_user._id, 'Email', 'complete', true);
      } else {
        updateDocuments(_user._id, 'Email', 'enable', true);
      }
    } else {
      updateDocuments(_user._id, 'IDV', 'enable', true);
    }

    Meteor.defer(() => {
      try {
        insertLog(UserId, `Bank Added - ${bankAccount.bankName} ending ${bankAccount.mask}`);
        sendFundingSourceAdded(_user, bankAccount);
        if (!_user.plaidAssetReport || _user.plaidAssetReport.length === 0) {
          createAssetReport(_user._id);
        }
        updateBankChannels({ userID: _user._id });
      } catch (error) {
        logger.error(`[addBankAccount:defer func] ${JSON.stringify(error)}`);
        Sentry.captureException(error);
      }
    });

    await markInvitationCompleted({ userId: user._id, validParameter: ['hasFunding'] });

    return true;
  } catch (error) {
    logger.error(`[addBankAccount] [${UserId}] ${JSON.stringify(error)}`);
    Sentry.captureException(error);
    throw new Meteor.Error(error, 'try again later');
  }
}

async function addBankToWhitelist({ institution_id }) {
  Security.checkRole(Meteor.userId(), ['technical']);
  check(institution_id, String);

  if (SupportedBanks.findOne({ institution_id })) {
    throw new Meteor.Error('Institution already added to whitelist');
  }

  const request = {
    institution_id,
    country_codes: ['US']
  };

  const response = await plaidClient.institutionsGetById(request);

  const { institution } = response.data;

  return SupportedBanks.insert(institution);
}

async function removeBankFromWhitelist({ institution_id }) {
  Security.checkRole(Meteor.userId(), ['technical']);
  check(institution_id, String);
  return SupportedBanks.remove({ institution_id });
}

async function getBankOnWhitelist({ institution_id }) {
  check(institution_id, String);
  Security.checkIfAdmin(this.userId);
  return SupportedBanks.findOne({ institution_id });
}
async function enableBankAccount(userId) {
  try {
    Security.checkLoggedIn(Meteor.userId());
    check(userId, String);
    Meteor.users.update(userId, { $set: { blockAddBankAccount: false } });
  } catch (error) {
    console.error('Error al actualizar blockAddBankAccount:', error);
  }
}

async function bankLinkError({ userId, error, metadata }) {
  Security.checkLoggedIn(Meteor.userId());
  check(userId, String);

  const metadataObj = JSON.parse(metadata?.metadataJson);

  const bankName = metadataObj?.institution?.name ? `Bank: (${metadataObj?.institution?.name})` : '';
  const errorMessage = error?.errorMessage ? `Error: (${error?.errorMessage})` : '';

  if (bankName || errorMessage) {
    insertLog(userId, `Bank Sign In Issues, ${errorMessage} ${bankName}`);

    await changeStatus({ userId, status: STATUS.CUSTOMER_STUCK });
    await changeSubStatus({ userId, subStatus: SUB_STATUS.BANK_SIGN_ISSUES });
  }
}

Meteor.methods({
  'users.addBankAccount': addBankAccount,
  'users.updateBankAccount': updateBankAccount,
  'users.addBankToWhitelist': addBankToWhitelist,
  'users.removeBankFromWhitelist': removeBankFromWhitelist,
  'users.getBankOnWhitelist': getBankOnWhitelist,
  'users.enableBankAccount': enableBankAccount,
  'users.bankLinkError': bankLinkError
});
