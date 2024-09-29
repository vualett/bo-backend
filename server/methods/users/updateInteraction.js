import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import Deals from '../../collections/deals';
import { isValid, format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import Queue, { queueBirthdayScheduler, queueCallbackNotification } from '../../queue/queue';
import { capitalizeFirstLetterOfEachWord } from '../../utils/utils';
import insertLog from '../logs/insertGenericLog';
import Security from '../../utils/security';
import { unqualifyUser } from './qualifyUser';
import assignAgent from '../validation/assignAgent';
import notifyUser from '../../notifications/notifyUser';
import { parsePhoneNumber } from 'libphonenumber-js';
import Invitations from '../../collections/invitations';
import updateOnboardingInteractionStatusInvitation from './updateInteractionStatusInvi';
import { NotifyChannel } from '../../notifications/notifyChannel';
import updateDealInteractionStatus from '../repetition/updateDealInteractionStatus';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import { SUPPORT_NUMBER } from '../../keys';
import automaticReactivation from './reactivation/automaticReactivation';
import { JOB_NAME } from '../../queue/jobs/birthdaySchedulerUnderageJob';
import { insertNote } from '../notes';
import { insertTimelog } from '../timelogs/insertTimelog';
import { ROLE } from '../../consts/user';

export default async function updateInteraction({
  userId,
  status,
  by,
  callbackDate,
  reevaluationDate,
  flow,
  note,
  duplicatedAccountId,
  userAdmin,
  hasUpdateDealInteraction,
}) {
  check(userId, String);
  check(status, String);

  const responsable =
    by || (userAdmin ? Meteor.users.findOne({ _id: userAdmin }) : Meteor.users.findOne({ _id: Meteor.userId() }));

  const user = Meteor.users.findOne({ _id: userId });
  if (!user) {
    throw new Meteor.Error('USER_NOT_FOUND');
  }

  if (status === 'underage' && !reevaluationDate) {
    throw new Meteor.Error('NO REEVALUATION DATE PROVIDED');
  }

  if (user.interaction?.status === 'underage' && status !== 'underage') {
    Queue.cancel({
      name: JOB_NAME,
      'data.id': userId
    });
  }

  const invitation = Invitations.findOne({ userId });

  const _pipeline = [
    {
      $match: {
        _id: userId,
        'assignedAgent.category': 'validation'
      }
    }
  ];
  const haveAssignedAgent = await Meteor.users.rawCollection().aggregate(_pipeline).toArray();
  if (
    status === 'reactivate' &&
    user.status?.verified === true &&
    user.status?.upgradeRequested !== true &&
    user.status?.reactivationRequested !== true
  ) {
    if (user?.business?.industry !== 'Business' && (await automaticReactivation(user))) {
      return true;
    } else {
      if (
        user.metrics &&
        (!user.metrics.cashAdvances || user.metrics.cashAdvances.count == null || user.metrics.cashAdvances.count <= 0)
      ) {
        assignAgent({
          userId,
          category: 'seniorUnderwriter'
        });
      } else {
        assignAgent({
          userId,
          category: status
        });
      }
    }
  }
  if (status === 'escalate' || status === 'reevaluation' || (status === 'upgrade' && haveAssignedAgent.length < 1)) {
    if (
      user.metrics &&
      (!user.metrics.cashAdvances || user.metrics.cashAdvances.count == null || user.metrics.cashAdvances.count <= 0)
    ) {
      assignAgent({
        userId,
        category: 'seniorUnderwriter'
      });
    } else {
      assignAgent({
        userId,
        category: status
      });
    }
  }

  // send notification if have a bank issue
  const phoneNumber = parsePhoneNumber(SUPPORT_NUMBER || '+16465134224');

  const formattedPhoneNumber = phoneNumber.formatNational();

  if (flow === ROLE.ONBOARDING && ['bank issues'].includes(status)) {
    const text = `Dear user, the financial institution you are trying to add to the Ualett APP is not supported, please try another one or contact us at ${formattedPhoneNumber} or email at: support@ualett.com`;

    await notifyUser({
      body: text,
      service: 'accNotification',
      userId,
      channel: NotifyChannel.PUSH
    });
  }

  if (hasUpdateDealInteraction) {
    const latestCompletedDeal = Deals.findOne({ userId }, { sort: { completeAt: -1 } });

    if (latestCompletedDeal) {
      updateDealInteractionStatus({
        userId,
        dealId: latestCompletedDeal?._id,
        status,
        callbackDate,
        responsable,
        note
      });
    }
  }

  Meteor.users.update(
    { _id: userId },
    {
      $set: {
        interaction: {
          timestamp: new Date(),
          by: by || {
            name: capitalizeFirstLetterOfEachWord(responsable?.firstName),
            id: responsable?._id
          },
          status,
          callbackDate,
          flow,
          note: status.toUpperCase() + (note ? ': ' + note : '')
        },
        ...(status === 'reevaluation' && flow === ROLE.ONBOARDING && { 'status.qualify': true }),
        ...(status === 'reevaluation' && flow === ROLE.REPETITION && { 'status.verified': false }),
        ...(status === 'reactivate' && { 'status.reactivationRequested': true }),
        ...((status === 'upgrade' || status === 'escalate') && { 'status.upgradeRequested': true })
      }
    },
    (err, data) => {
      if (err) {
        throw new Meteor.Error(err);
      } else if (data) {
        if (invitation && flow === ROLE.ONBOARDING) {
          updateOnboardingInteractionStatusInvitation({
            invitationId: invitation?._id,
            status,
            note,
            system: by
          });
        }

        if (by?.name !== 'system') {
          let message =
            !!flow && [ROLE.ONBOARDING, 'validation', ROLE.REPETITION].includes(flow)
              ? status + (note ? ': ' + note : '')
              : status;

          if (status === 'callback' && isValid(callbackDate)) {
            message = `Scheduled Callback: ${format(callbackDate, 'eeee MMMM d')}, at ${formatInTimeZone(
              callbackDate,
              'America/New_York',
              'hh:mm a'
            )}`;
          } else if (status === 'underage' && isValid(reevaluationDate)) {
            message = 'underage till ' + format(reevaluationDate, 'eeee do, MMMM y') + (note ? ': ' + note : '');
          } else if (['declined', 'unqualify'].includes(status) && isValid(reevaluationDate)) {
            message = 'reevaluate on ' + format(reevaluationDate, 'eeee do, MMMM y') + (note ? ': ' + note : '');
          } else if (status === 'incomplete') {
            message = status + (note ? ': ' + note : '');
          }

          if (by === 'system' && status === 'check2') {
            insertLog(userId, 'check2');
          } else {
            insertNote({
              message,
              where: 'user',
              userId,
              by,
              type: 'status',
              flow,
              duplicatedAccountId,
              responsable
            });

            if (status === 'suspended') {
              insertTimelog({
                userId: user._id,
                event: message,
                type: 'account',
                eventType: 'user',
                metadata: {
                  type: 'suspended'
                },
                _by:
                  Meteor.user() !== undefined
                    ? { id: Meteor.user()._id, name: `${Meteor.user().firstName} ${Meteor.user().lastName}` }
                    : { id: 'system', name: 'system' }
              });
            }
          }
        } else {
          if (!['not reactivated', 'suspended'].includes(status)) {
            insertLog(userId, status, null, 'status');
          }
        }

        if (status === 'callback' && isValid(callbackDate)) {
          queueCallbackNotification({
            name: `${capitalizeFirstLetterOfEachWord(user?.firstName)} ${capitalizeFirstLetterOfEachWord(
              user?.lastName
            )}`,
            callbackTo: 'user',
            uniqueId: userId,
            by: by || {
              name: capitalizeFirstLetterOfEachWord(responsable?.firstName),
              id: responsable?._id
            },
            callbackDate
          });
        }

        if (flow === ROLE.ONBOARDING && ['bank issues'].includes(status)) {
          unqualifyUser({ userId });
        }

        if (flow === ROLE.ONBOARDING && status === 'underage') {
          queueBirthdayScheduler({
            id: userId,
            callbackDate: reevaluationDate,
            note,
            isInvitation: false
          });
        }
      }
    }
  );
}

// DEFINING METHOD
const method = {
  type: 'method',
  name: 'users.updateInteractionStatus'
};

DDPRateLimiter.addRule(method, 1, 1000);

Meteor.methods({
  [method.name]: function updateInteractionMethod(params) {
    Security.checkIfAdmin(this.userId);
    return updateInteraction(params);
  }
});
