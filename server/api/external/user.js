import { API } from '../api';
import { Meteor } from 'meteor/meteor';
import logger from '../../logger/log';
import IPWhiteListCheck from '../middlewares/IPWhiteListCheck';

API.get('/external/user/:_id', IPWhiteListCheck, async (req, res) => {
  try {
    const { _id } = req.params;

    const result = Meteor.users.findOne(
      { _id },
      {
        fields: {
          createdAt: 1,
          hasFunding: 1,
          hasDriverLicense: 1,
          currentCashAdvance: 1,
          'status.verified': 1,
          'status.qualify': 1,
          metrics: 1,
          firstName: 1,
          lastName: 1
        }
      }
    );

    return res.status(200).json(result);
  } catch (error) {
    logger.error('API::external/user/:_id', error);
    res.status(500).send('Something went wrong');
  }
});
