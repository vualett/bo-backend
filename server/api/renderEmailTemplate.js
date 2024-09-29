import { Buffer } from 'buffer';
import { Meteor } from 'meteor/meteor';
import { API } from './api';
import Deals from '../collections/deals';
import renderEmailTemplate from '../emails/templates';

API.get('/renderemail', async (req, res) => {
  const deal = await Deals.findOne({ _id: 'AHNwo865GCegZMCFA' });
  const user = Meteor.users.findOne({ _id: deal.userId });
  const payment = deal.payments[4];

  res.set('Content-Type', 'text/html');
  res.type('text/html');
  res.status(200);

  const html = renderEmailTemplate.paymentInitiated({
    user,
    deal,
    payment
  });

  res.send(Buffer.from(html));
});
