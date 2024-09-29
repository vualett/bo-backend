/* eslint-disable no-control-regex */
import { Meteor } from 'meteor/meteor';
import differenceInMonths from 'date-fns/differenceInMonths';
import { parsePhoneNumber } from 'libphonenumber-js';
import Invitations from '../../collections/invitations';
import { InvitationStatusOptions } from './invitationStatusOptions';
import sendTwilioMessage from '../../../server/sms/sendTwilioMessage';
import * as Sentry from '@sentry/node';
import logger from '../../logger/log';

const canInvite = (invitation, by) => {
  if (!invitation) return true;

  const diffInMonths = differenceInMonths(new Date(), invitation.when);

  if (diffInMonths >= 9) {
    if (invitation.userId) throw new Meteor.Error('USER ALREADY INVITED', 'there is an used invitation');
    if (invitation.by !== by) return true;
  }

  throw new Meteor.Error('USER ALREADY INVITED');
};

export default async function createInvitation({ phone, by, metadata, referral }) {
  try {
    const { number } = parsePhoneNumber(phone, 'US');
    if (!by) throw new Meteor.Error('FAIL');

    const existingInvitation = Invitations.findOne({ 'phone.number': number }, { sort: { when: -1 } });

    canInvite(existingInvitation, by);

    if (!metadata.name) {
      throw new Meteor.Error('NAME_NO_EXISTS');
    }

    const cleanedName = metadata.name
      .replace(/[^\x00-\x7F]/g, '')
      .replace(/[0-9]/g, '')
      .trim();

    metadata.name = cleanedName;

    const invitationToSend = {
      phone: [{ number, type: 'Primary' }],
      status: InvitationStatusOptions.PENDING,
      used: false,
      by,
      ...(referral ? { referral } : {}),
      when: new Date(),
      metadata
    };

    const invitation = Invitations.insert(invitationToSend);

    if (!invitation) throw new Meteor.Error('ERROR_CREATING_INVITATION');

    let body =
      'You have been invited to Ualett app.' +
      '\nUse it to cash up to USD 2,500 of your future account receivables today!' +
      '\nDownload App: http://get.ualett.com';

    if (!['promoCode', 'virtual-assistant'].includes(by)) {
      const user = await Meteor.users.findOneAsync({ _id: by });

      if (!user) throw new Meteor.Error('ERROR_USER_NOT_FOUND');

      const { type, firstName, promoterDownloadLink } = user;

      if (type === 'user' && firstName) {
        const referralAmount = metadata.typeOfReferral === 'truck' ? '3000' : '2500';
        const firstNameCapitalize = firstName.charAt(0).toUpperCase() + firstName.slice(1);

        const downloadAppLink = promoterDownloadLink || 'http://get.ualett.com';

        body =
          `${firstNameCapitalize} has invited you to Ualett app.` +
          `\nUse it to cash up to USD ${referralAmount} , in cash advance today!` +
          `\nDownload App: ${downloadAppLink}`;
      }
    }

    await sendTwilioMessage({
      body,
      service: 'marketing',
      to: number
    });

    return invitationToSend;
  } catch (error) {
    Sentry.captureException(error);
    logger.error(`createInvitation ${error}`);
    throw new Error(error);
  }
}
