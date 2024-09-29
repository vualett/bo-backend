import express from 'express';
import { Meteor } from 'meteor/meteor';
import { API } from '../api';

function updateData(ocrData) {
  const { userID } = ocrData;

  const toSet = {
    'documents.driverLicense.status': 'processed',
    'documents.driverLicense.info.raw': ocrData
  };

  if (ocrData.stateMatched) toSet['documents.driverLicense.info.state'] = ocrData.state.name;
  if (ocrData.validDate) toSet['documents.driverLicense.info.exp'] = ocrData.expDate;
  if (ocrData.sex) toSet['documents.driverLicense.info.sex'] = ocrData.sex;
  if (ocrData.id) toSet['documents.driverLicense.info.id'] = ocrData.id;
  if (ocrData.dobDate) toSet['documents.driverLicense.info.dob'] = ocrData.dobDate;
  if (ocrData.nameMatchPercentage) {
    toSet['documents.driverLicense.info.nameMatch'] = ocrData.nameMatchPercentage;
  }

  Meteor.users.update({ _id: userID }, { $set: toSet });
}

API.post(
  '/webhooks/ocr',
  express.json(),
  Meteor.bindEnvironment((req, res) => {
    const { body } = req;
    if (body.userID) updateData(body);
    res.status(200).send();
  })
);
