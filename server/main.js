import os from 'os';
import { Meteor } from 'meteor/meteor';
import './plaid/methods';
import './dwolla/methods';
import './accounts';
import './methods';
import './security';
import './publications';
import './api';
import './gracefulShutdown';
import './cronJobs';
import accountsConfig from './accounts/config';
import { agendaInit } from './agenda/agenda';
import { queueInit } from './queue/queue';
import createIndexes from './createDBIndexes';
import initWebNotifications from './webNotifications';
import sentryInit from './sentry';
import logger from './logger/log';
import { ENV, RUN_CRON_JOBS } from './keys';

const instanceId = process.env.NODE_APP_INSTANCE || 0;

const startupMessage = () => {
  const commitVersion = Meteor.gitCommitHash ? Meteor.gitCommitHash.substring(0, 7) : '';
  const hostname = os.hostname();
  logger.info(`Started:  \`${commitVersion}\` on instance: \`${instanceId}\` on host: \`${hostname}\``);
};

Meteor.startup(() => {
  if (['staging', 'sandbox' ,'development'].includes(ENV)) {
    import('../imports/development/server/startup').then(() => logger.info('[DEVELOPMENT MODE]'));
  }

  if (RUN_CRON_JOBS === 'yes') {
    agendaInit();
    queueInit();
  }

  accountsConfig();
  createIndexes();
  sentryInit();
  initWebNotifications();
  startupMessage();

});
