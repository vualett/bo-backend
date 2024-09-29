import { Meteor } from 'meteor/meteor';
import { API } from '../api';
import { EXPORT_METHOD_SECRET } from '../../keys';
import * as Sentry from '@sentry/node';
import logger from '../../../server/logger/log';
API.get('/api/admins', (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const { token } = req.headers;

    if (EXPORT_METHOD_SECRET !== token) {
      res.status(401).send(
        JSON.stringify({
          status: 'error',
          error: 'not-authorized'
        })
      );
    }

    const admins = Meteor.users
      .find(
        { isAdmin: true, disabled: { $ne: true } },
        {
          fields: {
            'status.online': 1,
            'status.lastLogin.date': 1,
            'status.lastLogin.ipAddr': 1,
            'status.lastActivity': 1,
            heartbeat: 1
          }
        }
      )
      .fetch();

    res.status(200).send(
      JSON.stringify({
        status: 'success',
        results: admins
      })
    );
  } catch (error) {
    Sentry.captureException(error);
    logger.error(`Error in /api/admins: ${error}`);
    return res.status(500).send('FAIL');
  }
});
