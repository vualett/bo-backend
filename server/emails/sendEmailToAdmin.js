import { Email } from 'meteor/email';
import { Meteor } from 'meteor/meteor';
import { ENV, MAIL_FROM } from '../keys';

export default function sendEmailToAdmin(msg, subject) {
  if (Meteor.isDevelopment || ENV === 'staging') return console.log(`Email: ${msg}`);

  const email = {
    to: 'cabrera@ualett.com',
    from: MAIL_FROM,
    subject: subject ? `Backoffice Notification - ${subject}` : 'Backoffice Notification',
    text: msg
  };
  Meteor.defer(() => Email.send(email));
  return true;
}
