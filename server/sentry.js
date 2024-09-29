/* eslint-disable no-unused-vars */
import { Meteor } from 'meteor/meteor';
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import { ENV, SENTRY } from './keys';

const commitVersion = Meteor.gitCommitHash ? Meteor.gitCommitHash.substring(0, 7) : '';

export default function sentryInit(app) {
  Sentry.init({
    dsn: SENTRY,
    release: commitVersion,
    environment: ENV || 'development',
    integrations: [new Sentry.Integrations.Http({ tracing: true })],
    tracesSampleRate: 0.2,
    enabled: process.env.NODE_ENV !== 'development'
  });
}
