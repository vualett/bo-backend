import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { lt, $, gt } from 'moneysafe';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import { Random } from 'meteor/random';
import Deals from '../../../collections/deals';
import Invitations from '../../../collections/invitations';
import { Settings } from '../../../collections/settings';
import updateOnboardingInteractionStatus from '../../push/updateInteractionStatus';
import updateInteraction from '../../users/updateInteraction';
import logger from '../../../logger/log';
import * as Sentry from '@sentry/node';
import Queue from '../../../queue/queue';
import { processDocuments } from './processDocumentsToQueue';
import changeStage from '../../users/changeStage';
import { STAGE } from '../../../consts/user';

import isRTPEnabled from './isRTPEnabled';

const DEBIT_CHANNELS = {
  STANDARD_ACH: 'STANDARD_ACH',
  SAME_DAY_ACH: 'SAME_DAY_ACH'
};

const STATE_NOT_ALLOWED = [];
const LIMIT_CYCLIC_REAPPOINTMENT = 3;

// DEFINING METHOD
const method = {
  type: 'method',
  name: 'deals.request',
  clientAddress: () => true
};

const requestDeal = async (deal, userId) => {
  const USERID = userId || Meteor.userId();
  check(USERID, String);
  check(deal, {
    amount: Number,
    termsOfPayment: String,
    numberOfPayments: Number,
    fee: Number,
    reasons: Match.Maybe(Array),
    base64Sign: Match.Maybe(String),
    signatures: Match.Maybe(Array)
  });

  const user = Meteor.users.findOne({ _id: USERID });

  const assignedRepetition = user?.assignedAgent?.find((item) => item.category === 'repetition');

  try {
    if (deal.amount === 0) {
      throw new Meteor.Error('CASH_ADVANCE_DISABLED');
    }
    if (STATE_NOT_ALLOWED.includes(user?.address?.state)) {
      throw new Meteor.Error('STATE_NOT_ALLOWED');
    }

    if (['CA'].includes(user?.address?.state) && deal.signatures === undefined) {
      throw new Meteor.Error('UPDATE_APP');
    }

    const { amount, fee, numberOfPayments, termsOfPayment, signatures, base64Sign } = deal;

    if (
      Deals.findOne({
        userId: USERID,
        status: {
          $in: ['active', 'requested', 'approved', 'suspended', 'closed']
        }
      })
    ) {
      throw new Meteor.Error('the customer has already requested a cash advance');
    }

    const PRODUCTNAME = `CA${amount + termsOfPayment.toUpperCase()}#${numberOfPayments}@${fee}`;

    const createdAt = new Date();

    const feeDiscount = await Settings.findOne({ _id: 'feeDiscount' });

    const addFeeDiscount =
      !!feeDiscount?.value &&
      $(1).minus(feeDiscount.value).valueOf() &&
      gt($($(1).minus(feeDiscount.value).valueOf()), $(0)) &&
      lt($($(1).minus(feeDiscount.value).valueOf()), $(1));

    const RTPEnabled = await isRTPEnabled(user);

    const dealToInsert = {
      product_name: PRODUCTNAME,
      idempotencyKey: Random.id(),
      status: 'requested',
      userId: USERID,
      amount,
      fee,
      numberOfPayments,
      termsOfPayment,
      payments: [],
      createdAt,
      metrics: { rescheduledPayments: 0, failedPayments: 0 },
      autoRescheduleCount: LIMIT_CYCLIC_REAPPOINTMENT,
      transferChannel: RTPEnabled ? 'RTP' : 'ACH',
      debitChannel: DEBIT_CHANNELS.SAME_DAY_ACH
    };

    const lastDeal = Deals.findOne({ userId: USERID }, { sort: { createdAt: -1 } });

    if (!lastDeal) {
      dealToInsert.firstDeal = true;

      if (user?.offStage?.stage === STAGE.SALES.STAGE_6) {
        await changeStage({
          userId: USERID,
          stage: STAGE.SALES.STAGE_7
        });
      }

      const invitation = Invitations.findOne({ userId: USERID });
      if (invitation) {
        updateOnboardingInteractionStatus({
          invitationId: invitation._id,
          status: 'requested',
          system: true
        });
      }
    } else {
      if (assignedRepetition) {
        dealToInsert.assignedAgent = [assignedRepetition];
      }

      Meteor.defer(
        updateInteraction.bind(undefined, {
          userId: USERID,
          dealId: lastDeal._id,
          userAdmin: Meteor.userId(),
          status: 'requested',
          by: 'system',
          flow: 'repetition',
          hasUpdateDealInteraction: true
        })
      );
    }

    // pending to remove
    if (base64Sign) {
      dealToInsert.mca = {
        status: 'pending'
      };
    }

    if (addFeeDiscount) dealToInsert.feeDiscount = $(feeDiscount.value).valueOf();

    if (Deals.find({ userId: USERID, status: 'closed' }).count() > 0) {
      throw new Meteor.Error('CASH_ADVANCE_DISABLED');
    }

    const insert = Deals.insert(dealToInsert);

    if (!insert) {
      return false;
    }

    Meteor.users.update(
      { _id: USERID },
      {
        $set: {
          currentCashAdvance: {
            id: insert,
            status: 'requested',
            amount,
            signatures,
            createdAt
          }
        }
      }
    );

    const documents = await processDocuments({
      request: deal,
      dealCreated: { ...dealToInsert, dealId: insert },
      user
    });

    const documentToSet = documents.reduce((a, v) => ({ ...a, [v.documentName]: { status: 'pending' } }), {});

    Deals.update({ _id: insert }, { $set: { documents: documentToSet } });
    Queue.cancel({ name: 'checkIfDealIsNotTaken', 'data.userId': userId });

    return { message: 'Success', firstDeal: !!dealToInsert.firstDeal };
  } catch (error) {
    Sentry.captureException(error);
    logger.error(`${method.name}[${USERID}] ${error}`);

    if (error.error === 'CASH_ADVANCE_DISABLED') {
      throw new Meteor.Error('Sorry, you can not make a request at the moment, please contact us.');
    }

    if (error.error === 'UPDATE_APP') {
      throw new Meteor.Error('Please update your app to continue.');
    }

    if (error.error === 'STATE_NOT_ALLOWED') {
      throw new Meteor.Error('Sorry, we are not in your state at the moment.');
    }

    throw new Meteor.Error('please, try again later.');
  }
};

DDPRateLimiter.addRule(method, 1, 10000);

Meteor.methods({
  [method.name]: requestDeal
});
