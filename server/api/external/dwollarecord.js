import { API } from '../api';
import { Meteor } from 'meteor/meteor';
import logger from '../../logger/log';
import customerStatus from '/server/methods/users/dwolla/checkUserStatus';

API.get('/getinfo/customer/:userId/dwollaUserStatus', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const user = await Meteor.users.findOneAsync({ _id: userId });

    if (!user) {
      return res.status(400).json({ error: 'USER_NOT_FOUND' });
    }

    const { dwollaCustomerURL } = user;
    if (!dwollaCustomerURL || typeof dwollaCustomerURL !== 'string') {
      return res.status(400).json({ error: 'Invalid or missing Dwolla Url' });
    }

    const result = await customerStatus(dwollaCustomerURL, userId);

    return res.status(200).json(result);
  } catch (error) {
    logger.error('API::/getinfo/customer/:userId/dwollaUserStatus', error);
    return res.status(500).json({ error: 'Something went wrong' });
  }
});
