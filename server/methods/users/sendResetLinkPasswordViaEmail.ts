import { Meteor } from 'meteor/meteor';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import { queueSendEmail } from '../../queue/queue';
import renderEmailTemplate from '../../emails/templates';
import { Random } from 'meteor/random';
import logger from '../../logger/log';


async function sendResetLinkPasswordViaEmail(userID: string): Promise<{ data: string }> {
  try {
    const user = Meteor.users.findOne({ _id: userID });

    if (!user) throw new Meteor.Error('User does not exist!');

    let userVerifiedEmail = '';

    user.emails?.every((item) => {
      if (item.verified) {
        userVerifiedEmail = item.address;
        return false;
      }

      return true;
    });

    if (!userVerifiedEmail) throw new Meteor.Error('Not verified email found!');

    const tokenRecord = {
      token: Random.secret(),
      address: userVerifiedEmail,
      when: new Date()
    };

    Meteor.users.update(
      { _id: userID },
      {
        $set: {
          'services.password.reset.token': tokenRecord.token,
          'services.password.reset.createdAt': tokenRecord.when
        }
      }
    );

    const url = `https://app.ualett.com/reset-password/${tokenRecord.token}`;

    const emailToSent = {
      to: tokenRecord.address,
      subject: 'Reset Password Link',
      html: renderEmailTemplate.resetPassword({ url }) as string,
      userId: user._id
    };

    await queueSendEmail(emailToSent);

    return {
      data: tokenRecord.address
    };
  } catch (error) {
    const { message } = error as Error;
    logger.error(`users.sendResetLinkPasswordViaEmail:${message}`);
    throw new Meteor.Error('Try again later');
  }
}

// DEFINING METHOD

const method = {
  type: 'method',
  name: 'users.sendResetLinkPasswordViaEmail'
};

DDPRateLimiter.addRule(method, 1, 300000);

Meteor.methods({ [method.name]: sendResetLinkPasswordViaEmail });
