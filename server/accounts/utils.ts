import { Meteor } from 'meteor/meteor';
import phone from 'phone';

export const checkIfPhoneNumberExist = (number: number): boolean | never => {
  if (
    Meteor.users.findOne({
      $or: [{ 'phone.others.number': number }, { 'phone.number': number }]
    }) !== undefined
  )
    throw new Meteor.Error(403, 'Account already exists with this number');
  return true;
};

export const truncateEmail = (email: string): string => {
  const [user, domain] = email.split('@');

  return `${user.slice(0, 3)}xxxxx@${domain}`;
};

export function truncatePhoneNumber(number: string): string {
  const { isValid, phoneNumber, countryCode } = phone(number);

  if (!isValid) return '';

  return `${countryCode} XXX ${phoneNumber.slice(-4)}`;
}

export const extractDwollaCustomerURL = (url?: string): string => {
  if (url === undefined) return '';

  const parts = url.split('/');

  return parts[parts.length - 1];
};
