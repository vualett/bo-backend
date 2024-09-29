import { Meteor } from 'meteor/meteor';
import logger from '../logger/log';
import { check } from 'meteor/check';
import Security from '../utils/security';
import { textract } from '../aws/services';
import dataFilter from '../utils/ocr/dataFilter';
import bound from '../utils/bound';
import { AWS_DL_BUCKET_NAME } from '../keys';

const sendToOCR = async ({ fileID, userID, key }) => {
  check(fileID, String);
  check(userID, String);
  Security.checkRole(Meteor.userId(), ['super-admin', 'admin', 'technical']);

  // If file is not saved on S3, return all fields empty
  if (!key) {
    const toSet = {
      'documents.driverLicense.status': 'processed',
      'documents.driverLicense.info.raw': {}
    };

    Meteor.users.update({ _id: userID }, { $set: toSet });
    return false;
  }

  // Process through S3
  try {
    Meteor.users.update({ _id: userID }, { $set: { 'documents.driverLicense.status': 'processing' } });

    const user = Meteor.users.findOne({ _id: userID });

    var params = {
      Document: {
        S3Object: {
          Bucket: AWS_DL_BUCKET_NAME,
          Name: `${fileID}.png`
        }
      }
    };

    const data = await new Promise((resolve, reject) =>
      textract.detectDocumentText(params, function (err, data) {
        bound(() => {
          if (err) {
            return reject(err);
          } else {
            resolve(data);
          }
        });
      })
    );

    const ocrData = dataFilter(data, `${user.firstName} ${user.lastName}`);
    const detect = '-';
    const replaceWith = '';
    const toSet = {
      'documents.driverLicense.status': 'processed',
      'documents.driverLicense.info.raw': ocrData
    };

    if (ocrData.stateMatched) toSet['documents.driverLicense.info.state'] = ocrData.state.name;
    if (ocrData.validDate) toSet['documents.driverLicense.info.exp'] = ocrData.expDate;
    if (ocrData.sex) toSet['documents.driverLicense.info.sex'] = ocrData.sex;
    if (ocrData.id) toSet['documents.driverLicense.info.id'] = ocrData.id.split(detect).join(replaceWith);
    if (ocrData.dobDate) toSet['documents.driverLicense.info.dob'] = ocrData.dobDate;
    if (ocrData.nameMatchPercentage) toSet['documents.driverLicense.info.nameMatch'] = ocrData.nameMatchPercentage;

    Meteor.users.update({ _id: userID }, { $set: toSet });

    return 'done';
  } catch (error) {
    Meteor.users.update({ _id: userID }, { $set: { 'documents.driverLicense.status': 'unprocessed' } });
    logger.error(`Error on sendToOCR method: ${error}`);
    throw new Meteor.Error(error.name, error.message, error.description);
  }
};

// DEFINING METHOD
const method = {
  type: 'method',
  name: 'sendToOCR',
  clientAddress: () => true
};

DDPRateLimiter.addRule(method, 2, 60000);

Meteor.methods({
  [method.name]: sendToOCR
});
