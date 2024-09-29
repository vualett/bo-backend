import { Meteor } from 'meteor/meteor';

const CURRENT_PATH_DATE = '$identityVerification.data.DOB';
const OLD_PATH_DATE = '$documents.driverLicense.info.dob';
const FORMAT_DATE = '%d/%m';

export const getUsersWithBirthdayIds = async (): Promise<string[]> => {
  const currentDate = new Date();

  const query = {
    $or: [
      {
        $expr: {
          $eq: [
            { $dateToString: { format: FORMAT_DATE, date: currentDate } },
            { $dateToString: { format: FORMAT_DATE, date: { $toDate: CURRENT_PATH_DATE } } }
          ]
        }
      },
      {
        $expr: {
          $eq: [
            { $dateToString: { format: FORMAT_DATE, date: currentDate } },
            {
              $dateToString: {
                format: FORMAT_DATE,
                date: {
                  $dateFromParts: {
                    day: { $toInt: { $arrayElemAt: [{ $split: [OLD_PATH_DATE, '/'] }, 0] } },
                    month: { $toInt: { $arrayElemAt: [{ $split: [OLD_PATH_DATE, '/'] }, 1] } },
                    year: { $toInt: { $arrayElemAt: [{ $split: [OLD_PATH_DATE, '/'] }, 2] } }
                  }
                }
              }
            }
          ]
        }
      }
    ]
  };

  const usersToBirthday = await Meteor.users.find(query).fetchAsync();

  return usersToBirthday.map(({ _id }) => _id);
};
