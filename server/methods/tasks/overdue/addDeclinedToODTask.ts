/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import axios from 'axios';
import Tasks from '../../../collections/tasks';
import { Meteor } from 'meteor/meteor';
import logger from '../../../logger/log';
import { jiraUrl, jiraConfig } from '../config';

interface PARAMS {
  task: Meteor.Task;
  user: Meteor.User;
  paymentNumber: number;
  returnCode: string;
}

export async function addDeclinedToODTask(params: PARAMS): Promise<Meteor.Task | undefined> {
  const { task, user, returnCode, paymentNumber } = params;

  try {
    const UPDATE_TITLE = 'Overdue Task For Payment Declination';
    const UPDATE_DESCRIPTION = `There is another Declined payment in Deal with ID "${task.docId}" payment #${paymentNumber} for ${returnCode} error code.`;

    const DECLINE_PAYMENT_LIST = task.metadata?.declinedPayments?.length // adding previous declines
      ? task.metadata.declinedPayments.map((i) => {
          return {
            value: `Payments #${i.number}`
          };
        })
      : [];

    DECLINE_PAYMENT_LIST.push({
      // adding the latest decline
      value: `Payments #${paymentNumber}`
    });

    const DECLINE_CODES_LIST = task.metadata?.declinedPayments?.length // adding previous codes
      ? task.metadata.declinedPayments.map((i) => {
          return {
            value: `${i.code}`
          };
        })
      : [];

    DECLINE_CODES_LIST.push({
      // adding the latest code
      value: `${returnCode}`
    });

    const PAID_PAYMENT_LIST = task.metadata?.declinedPayments?.filter((i) => i.paid).length
      ? task.metadata?.declinedPayments
          ?.filter((i) => i.paid)
          .map((j) => {
            return {
              value: `Payment #${j.number}`
            };
          })
      : [
          {
            value: 'NONE'
          }
        ];

    const NUMBER_OF_DECLINED_PAYMENTS = task.metadata.numberOfDeclinedPayments + 1;

    const data = {
      issuetype: {
        name: task.typeOfIssue
      },
      update: {
        summary: [
          {
            set: UPDATE_TITLE
          }
        ]
      },
      fields: {
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: UPDATE_DESCRIPTION
                }
              ]
            }
          ]
        },
        customfield_10073: DECLINE_PAYMENT_LIST,
        customfield_10074: `https://backoffice.ualett.com/user/${user._id}/cashadvance`,
        customfield_10075: `${user._id}`,
        customfield_10076: DECLINE_CODES_LIST,
        customfield_10077: `${user.firstName} ${user.lastName}`.toUpperCase(),
        customfield_10078: `${user.phone.number}`,
        customfield_10082: NUMBER_OF_DECLINED_PAYMENTS,
        customfield_10083: PAID_PAYMENT_LIST
      }
    };

    const res = await axios.put(`${jiraUrl}/${task.issueId}`, JSON.stringify(data), jiraConfig);

    if (res.status !== 204) throw new Meteor.Error('TASK_NOT_UPDATED!');

    const paymentNumberIsAlreadyDeclined = task.metadata?.declinedPayments?.find((i) => i.number === paymentNumber);

    if (paymentNumberIsAlreadyDeclined) {
      await Tasks.updateAsync(
        { _id: task._id, 'metadata.declinedPayments.number': paymentNumber },
        {
          $set: {
            'metadata.declinedPayments.$.paid': false
          },
          $inc: {
            'metadata.numberOfDeclinedPayments': 1
          }
        }
      );
    } else {
      await Tasks.updateAsync(
        { _id: task._id },
        {
          $push: {
            'metadata.declinedPayments': {
              number: paymentNumber,
              code: returnCode
            }
          },
          $inc: {
            'metadata.numberOfDeclinedPayments': 1
          }
        }
      );
    }

    const updatedTask = await Tasks.findOneAsync({ _id: task._id });

    return updatedTask;
  } catch (error) {
    logger.error(`[FUNCTION:addDeclinedToODTask] ${error}`);
    throw new Meteor.Error('Error updating Task.');
  }
}
