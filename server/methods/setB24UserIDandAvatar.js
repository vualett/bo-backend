/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { Meteor } from 'meteor/meteor';
import { HTTP } from 'meteor/http';
import Security from '../utils/security';
import logger from '../logger/log';
import { BITRIX24_API_SECRET } from '../keys';
const URL = `https://ualett.bitrix24.com/rest/1/${BITRIX24_API_SECRET}/user.get/`;

const getData = async () => {
  const data = [];
  let response = false;
  let nextURL = URL;

  try {
    do {
      response = await HTTP.call('GET', nextURL);
      if (!response) return false;
      if (response.statusCode !== 200) return false;

      data.push(...response.data.result);
      nextURL = `${URL}?start=${response.data.next}`;
    } while (response.statusCode === 200 && response.data.next);
  } catch (error) {
    logger.error(`[getData] ${JSON.stringify(error)}`);
  }

  return data;
};

Meteor.methods({
  setB24UserIDandAvatar: async () => {
    Security.checkIfAdmin(Meteor.userId());
    try {
      const result = await getData();

      const activeB24Users = result.filter((u) => u.ACTIVE && u.EMAIL.endsWith('@ualett.com'));

      const updatedList = [];

      for (const user of activeB24Users) {
        const updated = await Meteor.users.update(
          { 'emails.address': user.EMAIL },
          {
            $set: {
              'b24.userID': user.ID,
              'b24.avatarURL': user.PERSONAL_PHOTO
            }
          }
        );
        if (updated) {
          updatedList.push(user.EMAIL);
        }
      }

      return {
        count: updatedList.length,
        updatedList
      };
    } catch (error) {
      logger.error(`[setB24UserIDandAvatar] ${JSON.stringify(error)}`);
      throw error;
    }
  }
});
