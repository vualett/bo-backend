/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable import/no-duplicates */
import { Meteor } from 'meteor/meteor';
import * as Sentry from '@sentry/node';
import insertLog from '../logs/insertGenericLog';
import { differenceInHours } from 'date-fns';
import createAssetReport from '../users/plaid/createAssetReport';
import assignAgent from '../validation/assignAgent';
import AssetReports from '../../collections/assetReports';
import verifiedUser from '../../methods/users/verify/verify';
import notifyUser from '../../notifications/notifyUser';
import { NotifyChannel } from '../../notifications/notifyChannel';
import { updateDocuments } from '../users/set/setConfigMethods';
import setNeedMoreInfo from '../users/set/setNeedMoreInfo';
import { canSyncArgyle } from '../users/set/setConfigMethods';

async function validateClient(data: string, message: string): Promise<boolean | undefined> {
  const userData: Meteor.User | undefined = Meteor.users.findOne({ _id: data });

  const { _id, plaidAssetReport, firstName, lastName, business } = userData || {};

  if (plaidAssetReport === undefined || plaidAssetReport.length < 0) {
    Meteor.users.update({ _id }, { $set: { automaticFlowVerify: false } });
    insertLog(_id, 'Phase 3 Bank report unloaded.');
    await assignAgent({
      userId: _id,
      category: 'seniorUnderwriter'
    });
    return false;
  }

  const assetReportRecent = plaidAssetReport.reduce((max, obj) => (obj.requestedAt > max.requestedAt ? obj : max), {
    assetReportId: '',
    assetReportToken: '',
    requestedAt: new Date(0),
    inDB: ''
  });

  if (assetReportRecent === undefined) {
    Meteor.users.update({ _id }, { $set: { automaticFlowVerify: false } });
    insertLog(_id, 'Phase 3 Bank report unloaded.');
    await assignAgent({
      userId: _id,
      category: 'seniorUnderwriter'
    });
    return false;
  }

  const assetReportRequestedTime = differenceInHours(assetReportRecent.requestedAt, new Date());

  if (assetReportRequestedTime >= 48 && message === 'first call') {
    return true;
  }

  if (message === 'second call' && assetReportRequestedTime >= 48) {
    insertLog(_id, 'Phase 3 Bank report unloaded.');
    Meteor.users.update({ _id }, { $set: { automaticFlowVerify: false } });
    await assignAgent({
      userId: _id,
      category: 'seniorUnderwriter'
    });
    return false;
  }

  const assetReportInformation: Meteor.AssetReport | undefined = AssetReports.findOne({
    asset_report_id: assetReportRecent.assetReportId
  }) as Meteor.AssetReport | undefined;

  const { items } = assetReportInformation || {};

  const transactions: Meteor.Transaction[] | undefined = items?.[0]?.accounts?.[0]?.transactions;

  const clientCompletedName =
    firstName && lastName ? firstName.trim().toLowerCase() + ' ' + lastName.trim().toLowerCase() : '';

  const owners = items !== undefined ? items[0]?.accounts[0]?.owners[0].names : [];

  if (owners === undefined || clientCompletedName === undefined || owners.length > 2) {
    insertLog(_id, 'Phase 4- Account ownership unverified');
    Meteor.users.update({ _id }, { $set: { automaticFlowVerify: false } });
    await assignAgent({
      userId: _id,
      category: 'seniorUnderwriter'
    });
    return false;
  }

  const isTheSameName = owners.some(function (owner) {
    const ownerWithoutSpaces = owner.toLowerCase().replace(/\s/g, '');
    const clientWithoutSpaces = clientCompletedName.toLowerCase().replace(/\s/g, '');

    const ownerParts = owner.trim().toLowerCase().split(' ');
    const clientParts = clientCompletedName.trim().toLowerCase().split(' ');

    if (ownerWithoutSpaces.includes(clientWithoutSpaces) || clientWithoutSpaces.includes(ownerWithoutSpaces)) {
      return true;
    }

    const fullMatch = clientParts.every((clientPart) => ownerParts.includes(clientPart));
    if (fullMatch) {
      return true;
    }

    const matchingPartsCount = clientParts.filter((clientPart) => ownerParts.includes(clientPart)).length;
    const partialMatch = matchingPartsCount >= 2;

    return partialMatch;
  });

  if (!isTheSameName) {
    insertLog(_id, 'Phase 4- Account ownership unverified');
    Meteor.users.update({ _id }, { $set: { automaticFlowVerify: false } });
    await assignAgent({
      userId: _id,
      category: 'seniorUnderwriter'
    });
    return false;
  }

  const currentBalance = items !== undefined ? items[0]?.accounts[0]?.balances?.current : 0;
  const yesterDayBalance = items !== undefined ? items[0]?.accounts[0]?.historical_balances[0].current : 0;
  const balanceAccount = yesterDayBalance + currentBalance;

  const fechaActual = new Date();
  const fechaTresMesesAtras = new Date();
  fechaTresMesesAtras.setMonth(fechaTresMesesAtras.getMonth() - 3);

  const getOverdraff = (transactions ?? []).filter(function (transaccion) {
    const fechaTransaccion = new Date(transaccion.date);
    return (
      fechaTransaccion >= fechaTresMesesAtras &&
      fechaTransaccion <= fechaActual &&
      (transaccion.original_description.includes('OVERDRAFT') ||
        transaccion.original_description.includes('RETURN') ||
        transaccion.original_description.includes('Reversal') ||
        transaccion.original_description.includes('FEE REVERSAL') ||
        transaccion.original_description.includes('NSF'))
    );
  });
  if (balanceAccount <= -125) {
    Meteor.users.update({ _id }, { $set: { automaticFlowVerify: false } });

    const logMessage =
      getOverdraff.length >= 5
        ? 'Customer has constant overdraft.'
        : 'Currently in overdraft. Customer is currently in significant overdraft.';

    insertLog(_id, logMessage);

    await assignAgent({
      userId: _id,
      category: 'seniorUnderwriter'
    });

    return false;
  }

  const incomeTransactions = transactions?.filter((t) => t.amount < 0) || [];
  const getUalettIncomes = (incomeTransactions ?? []).filter((transaction) => {
    const descriptions = ['ualett cabicash des'];

    return descriptions.some((description) => transaction.original_description.toLowerCase().includes(description));
  });

  if (getUalettIncomes.length > 0) {
    Meteor.users.update({ _id }, { $set: { automaticFlowVerify: false } });
    insertLog(_id, 'Phase 4: Customer have a Ualett Cabicash transacction ');
    await assignAgent({
      userId: _id,
      category: 'seniorUnderwriter'
    });

    return false;
  }
  const driverIncomes = (incomeTransactions ?? []).filter((transaction) => {
    const descriptions = [
      'shiftkey',
      'dlivrd llc',
      'handy.com',
      'relay delivery',
      'veho',
      'myle transportation',
      'branch messenger',
      'stripe',
      'wonolo',
      'favor',
      'rasier',
      'raiser',
      'ritzy transporta',
      'goshare inc',
      'knock konck',
      'the drivers coop',
      'stichting custod payment',
      'greendot pasadena',
      'shiftmed dir dep',
      'axlehire inc',
      'transfer hw',
      'etsy des',
      'pmnt rcvd',
      'curri inc',
      'adp workmarket direct',
      'ach credit curbco deposit',
      'uber',
      'lyft',
      'shipt',
      'doordarsh',
      'grubhub',
      'juno',
      'rasier, llc',
      'rtp from rasier',
      'raiser 6795',
      'ritzy transporta des:drivers',
      'stripe',
      'amazon',
      'united parcel',
      'ups',
      'zelle',
      'gusto payroll',
      'fedex',
      'maplebear'
    ];

    return descriptions.some(
      (description) =>
        transaction.original_description.toLowerCase().includes(description) &&
        !(description === 'amazon' && transaction.original_description.toLowerCase().includes('amazon bill'))
    );
  });

  const initialBalance = transactions?.length ? transactions[transactions.length - 1].amount : 0;

  const totalAmount90Days = incomeTransactions?.length
    ? incomeTransactions.reduce((total, transaction) => {
        return total + Math.abs(transaction.amount);
      }, 0)
    : 0;

  const dailyBalance = Math.abs(initialBalance) + totalAmount90Days / 90;

  const totalDriverIncomes = driverIncomes.reduce((total, transaction) => {
    return total + Math.abs(transaction.amount);
  }, 0);

  if (dailyBalance >= 80 && totalAmount90Days >= 7000 && totalDriverIncomes >= 1000) {
    await verifiedUser(_id, 'b', true, true);
    Meteor.users.update({ _id }, { $set: { automaticFlowVerify: false, autoApprovedAt: new Date() } });
    return false;
  }
  if (dailyBalance >= 70 && totalAmount90Days >= 4000 && totalDriverIncomes >= 700) {
    await verifiedUser(_id, 'c', true, true);
    Meteor.users.update({ _id }, { $set: { automaticFlowVerify: false, autoApprovedAt: new Date() } });
    return false;
  }
  if (totalAmount90Days < 4000) {
    Meteor.users.update({ _id }, { $set: { automaticFlowVerify: false } });
    insertLog(_id, 'Customer does not show enough incomes in the last 90 days.');
    await assignAgent({
      userId: _id,
      category: 'seniorUnderwriter'
    });

    return false;
  }
  if (totalDriverIncomes >= 125 && totalDriverIncomes <= 490) {
    Meteor.users.update({ _id }, { $set: { automaticFlowVerify: false } });
    insertLog(_id, 'The customer needs to submit additional information to proceed with the evaluation process');

    if (business?.industry === 'Independent Contractor Driver') {
      canSyncArgyle(_id, true);
    } else {
      updateDocuments(_id, 'Form 1099', 'enable', true);
      updateDocuments(_id, 'Form 1040', 'enable', true);
    }
    if (_id !== undefined) {
      await setNeedMoreInfo(_id);
      await notifyUser({
        body: 'After reviewing your account,you needs to submit additional information to proceed with the evaluation process',
        service: 'customerCare',
        userId: _id,
        channel: NotifyChannel.PUSH
      });
    }

    await assignAgent({
      userId: _id,
      category: 'seniorUnderwriter'
    });
    return false;
  }
  if (totalDriverIncomes >= 50 && totalDriverIncomes <= 100) {
    Meteor.users.update({ _id }, { $set: { automaticFlowVerify: false } });
    insertLog(_id, 'Customer does not show enough income as a driver or independent contractor.');
    await assignAgent({
      userId: _id,
      category: 'seniorUnderwriter'
    });

    return false;
  }
  if (totalDriverIncomes < 50) {
    Meteor.users.update({ _id }, { $set: { automaticFlowVerify: false } });
    insertLog(_id, 'Customer does not show income as a driver or independent contractor');
    await assignAgent({
      userId: _id,
      category: 'seniorUnderwriter'
    });

    return false;
  }

  if (dailyBalance < 70) {
    Meteor.users.update({ _id }, { $set: { automaticFlowVerify: false } });
    insertLog(_id, 'Average daily balance is lower than our minimum requirement.');
    await assignAgent({
      userId: _id,
      category: 'seniorUnderwriter'
    });

    return false;
  }
  insertLog(_id, 'The system cant automatic validate the client');
  Meteor.users.update({ _id }, { $set: { automaticFlowVerify: false } });
  await assignAgent({
    userId: _id,
    category: 'seniorUnderwriter'
  });
  return false;
}

export default async function automaticFlowVerify(userId: string): Promise<boolean | undefined> {
  try {
    const user: Meteor.User | undefined = Meteor.users.findOne({ _id: userId });
    const { _id, emails, firstName, lastName, phone, hasMatches, matchesFound } = user || {};
    const regexFirstName = { firstName: { $regex: new RegExp('^' + String(firstName).trim(), 'i') } };
    const regexLastName = { lastName: { $regex: new RegExp('^' + String(lastName).trim(), 'i') } };

    if (
      (user?.IDVMatch?.total !== undefined && user?.IDVMatch?.total < 90) ||
      user?.IDVMatch?.total === null ||
      user?.IDVMatch?.total === undefined
    ) {
      insertLog(_id, 'Phase 1. Identity Unverified.');

      await assignAgent({
        userId: _id,
        category: 'seniorUnderwriter'
      });
      Meteor.users.update({ _id }, { $set: { automaticFlowVerify: false } });
      return true;
    }

    const duplicateUser = Meteor.users
      .find(
        {
          $or: [
            {
              $and: [regexFirstName, regexLastName]
            },
            phone?.number && typeof phone.number === 'string' ? { 'phone.number': phone.number } : {},
            phone && typeof phone.number === 'string' ? { 'phone.others.number': phone.number } : {},
            emails && emails.length > 0 && typeof emails[0].address === 'string'
              ? { 'emails.address': emails[0].address }
              : {}
          ]
        },
        {
          fields: {
            _id: 1
          }
        }
      )
      .fetch();

    if (duplicateUser.length >= 2) {
      insertLog(
        _id,
        `Phase 2. Duplicate match found,The Customer have other account: ${duplicateUser
          .map((objeto) => objeto._id)
          .join(', ')}`
      );
      await assignAgent({
        userId: _id,
        category: 'seniorUnderwriter'
      });
      Meteor.users.update({ _id }, { $set: { automaticFlowVerify: false } });
      return true;
    }

    if (hasMatches) {
      Meteor.users.update({ _id }, { $set: { automaticFlowVerify: false } });
      await assignAgent({
        userId: _id,
        category: 'seniorUnderwriter'
      });
      if (matchesFound && matchesFound.length > 0) {
        insertLog(
          _id,
          `Phase 2. Duplicate match found, The Customer has other account(s): ${matchesFound
            .map((objeto) => objeto.userID)
            .join(', ')}`
        );
      } else {
        insertLog(_id, 'Phase 2. Duplicate match found, No other matching accounts found.');
      }

      return true;
    }
    if (_id && typeof _id === 'string') {
      if (await validateClient(_id, 'first call')) {
        await createAssetReport(_id);
        setTimeout(() => {
          void validateClient(_id, 'second call');
        }, 10000);
      }
    } else {
      Meteor.users.update({ _id }, { $set: { automaticFlowVerify: false } });
      await assignAgent({
        userId: _id,
        category: 'seniorUnderwriter'
      });
    }
    insertLog(_id, 'The system cant automatic validate the client');
    Meteor.users.update({ _id }, { $set: { automaticFlowVerify: false } });
    await assignAgent({
      userId: _id,
      category: 'seniorUnderwriter'
    });
    return false;
  } catch (error) {
    Sentry.captureException(error);
  }
}
