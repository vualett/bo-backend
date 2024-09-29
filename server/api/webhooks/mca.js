import express from 'express';
import { Meteor } from 'meteor/meteor';
import { API } from '../api';
import Deals from '../../collections/deals';

API.post(
  '/webhooks/agreement',
  express.json(),
  Meteor.bindEnvironment((req, res) => {
    const { dealId, docId, documentType } = req.body;

    let set = false;

    if (documentType === 'mca') {
      set = {
        'documents.mca.status': 'processed',
        'documents.mca.docId': docId,
        'documents.mca.createdAt': new Date()

      };
    }

    if (documentType === 'disclosure') {
      set = {
        'documents.disclosure.status': 'processed',
        'documents.disclosure.docId': docId,
        'documents.disclosure.createdAt': new Date()
      };
    }

    if (set && dealId && dealId.length > 0) {
      Deals.update(
        { _id: dealId },
        { $set: set }
      );
    }
    res.status(200).send();
  })
);
