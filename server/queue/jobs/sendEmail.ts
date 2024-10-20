import { Meteor } from 'meteor/meteor';
import { Email } from 'meteor/email';
import * as Sentry from '@sentry/node';
import logger from '../../logger/log';
import { Agenda, Job } from '@hokify/agenda';
import Emails from '../../collections/emails';
import { ENV, MAIL_FROM, MAIL_SMTP } from '../../keys';

export const JOB_NAME = 'sendEmail';

interface Parameters {
  to: string;
  subject: string;
  html: string;
  userId?: string;
}

const declareJob = async (job: Job<Parameters>, done: (error?: Error | undefined) => void): Promise<void> => {
  try {
    const { to, subject, html, userId } = job.attrs.data;

    const email = {
      to,
      replyTo: 'support@ualett.com',
      from: MAIL_FROM,
      subject,
      html
    };

    if (ENV && ['staging', 'development'].includes(ENV)) {
      email.to = 'cabrera@ualett.com';
    }
    if (MAIL_SMTP) {
      await Email.sendAsync(email);
    }
    if (userId) {
      await Emails.insertAsync({
        ...email,
        userId,
        createdAt: new Date()
      });
    }
    done();
  } catch (error: unknown) {
    const { message } = error as Meteor.Error;
    job.fail(message);
    Sentry.captureException(error);
    done();
  } finally {
    done();
  }
};

export const defineJob = (Queue: Agenda): void => Queue.define(JOB_NAME, declareJob);

export const runJob = async (Queue: Agenda, email: Parameters): Promise<void> | never => {
  try {
    await Queue.create(JOB_NAME, email).schedule('in 1 minute').save();
  } catch (error: unknown) {
    const { message } = error as Meteor.Error;

    logger.error(`[QUEUE:${JOB_NAME}] ${message}`);
    throw new Meteor.Error(message);
  }
};
