/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable no-case-declarations */
import { Meteor } from 'meteor/meteor';
import Tasks from '../../../collections/tasks';
import Deals from '../../../collections/deals';
import logger from '../../../logger/log';
import axios from 'axios';
import { findODTask } from './findODTask';
import { addDeclinedToODTask } from './addDeclinedToODTask';
import { jiraUrl, jiraConfig } from '../config';
import { updateStatusODTask } from './updateStatusODTask';
import { JIRA_OVERDUE } from '../../../keys';

export enum TypeOfIssue {
  TASK = 'Task',
  URGENT = 'Urgent'
}

interface PARAMS {
  dealID: string;
  paymentNumber: number;
  returnCode: string;
  typeOfIssue: TypeOfIssue;
}

export async function createOrUpdateODTask(params: PARAMS): Promise<boolean> {
  const { dealID, paymentNumber, returnCode, typeOfIssue } = params;

  try {
    const deal = await Deals.findOneAsync({ _id: dealID });
    if (!deal) throw new Meteor.Error('DEAL_NOT_FOUND!');

    if (deal.status !== 'active') throw new Meteor.Error('DEAL_NOT_ACTIVE!');

    const user = await Meteor.users.findOneAsync({ _id: deal.userId });
    if (!user) throw new Meteor.Error('USER_NOT_FOUND!');

    const foundTask = await findODTask(deal._id);

    if (foundTask?.issueStatus) {
      // CHECK IF TASKS EXISTS IN DB AND JIRA
      const addDeclinedToODTaskOBJ = {
        user,
        returnCode,
        paymentNumber,
        task: foundTask.task
      };

      // foundTask.issueStatus returns 2, 4, 3
      switch (foundTask.issueStatus) {
        case 2: // TO DO id: 2
        case 4: // IN PROGRESS, RESCHEDULED, DD REPAYMENTS, CALLBACKS  id: 4
          const existsTask = foundTask.task.metadata?.declinedPayments?.find(
            (i) => i.number === paymentNumber && i.code === returnCode
          );

          if (existsTask) {
            // IF THERE IS A TASK WITH SAME ERROR CODE AND PAYMENT NUMBER
            throw new Meteor.Error('TASK_ALREADY_EXISTS!');
          }
          await addDeclinedToODTask(addDeclinedToODTaskOBJ);
          return true;

        case 3: // DEAL FINISHED, NOT WORKABLE id: 3
          await addDeclinedToODTask(addDeclinedToODTaskOBJ);

          return await updateStatusODTask(foundTask.task.issueId, foundTask.transitionId);
        default:
          throw new Meteor.Error('ISSUE_STATUS_IS_UNKNOWN!');
      }
    } else if (foundTask?.task) {
      // CHECK IF TASKS EXISTS IN DB BUT NOT IN JIRA

      const SUMMARY = 'Overdue Task For Payment Declination';
      const DESCRIPTION = `There is another Declined payment in Deal with ID "${foundTask.task.docId}" payment #${paymentNumber} for ${returnCode} error code.`;

      const DECLINE_PAYMENT_LIST = foundTask.task.metadata?.declinedPayments?.length // adding previous declines
        ? foundTask.task.metadata.declinedPayments.map((i) => {
            return {
              value: `Payments #${i.number}`
            };
          })
        : [];

      DECLINE_PAYMENT_LIST.push({
        // adding the latest decline
        value: `Payments #${paymentNumber}`
      });

      const DECLINE_CODES_LIST = foundTask.task.metadata?.declinedPayments?.length // adding previous codes
        ? foundTask.task.metadata.declinedPayments.map((i) => {
            return {
              value: `${i.code}`
            };
          })
        : [];

      DECLINE_CODES_LIST.push({
        // adding the latest code
        value: `${returnCode}`
      });

      const PAID_PAYMENT_LIST = foundTask.task.metadata?.declinedPayments?.filter((i) => i.paid).length
        ? foundTask.task.metadata?.declinedPayments
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

      const AMOUNT_OF_DECLINE_PAYMENTS = foundTask.task.metadata.numberOfDeclinedPayments + 1;

      const DATA = {
        fields: {
          project: {
            key: JIRA_OVERDUE
          },
          issuetype: {
            name: typeOfIssue
          },
          summary: SUMMARY,
          description: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: DESCRIPTION
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
          customfield_10082: AMOUNT_OF_DECLINE_PAYMENTS,
          customfield_10083: PAID_PAYMENT_LIST
        }
      };

      const res = await axios.post(jiraUrl, JSON.stringify(DATA), jiraConfig);

      if (res.status !== 201) throw new Meteor.Error('ISSUE_NOT_CREATED!');

      const paymentNumberIsAlreadyDeclined = foundTask.task.metadata?.declinedPayments?.find(
        (i) => i.number === paymentNumber
      );

      if (paymentNumberIsAlreadyDeclined) {
        await Tasks.updateAsync(
          { _id: foundTask.task._id, 'metadata.declinedPayments.number': paymentNumber },
          {
            $set: {
              'metadata.declinedPayments.$.paid': false,
              issueId: res.data.id,
              issueKey: res.data.key
            },
            $inc: {
              'metadata.numberOfDeclinedPayments': 1
            }
          }
        );
      } else {
        await Tasks.updateAsync(
          { _id: foundTask.task._id },
          {
            $set: {
              issueId: res.data.id,
              issueKey: res.data.key
            },
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
    } else {
      // IT CREATES A NEW TASK

      const SUMMARY = 'Overdue Task For Payment Declination';
      const DESCRIPTION = `The Deal got a declined payment #${paymentNumber} for ${returnCode} error code.`;

      const DATA = {
        fields: {
          project: {
            key: JIRA_OVERDUE
          },
          issuetype: {
            name: typeOfIssue
          },
          summary: SUMMARY,
          description: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: DESCRIPTION
                  }
                ]
              }
            ]
          },
          // Decline payments
          customfield_10073: [
            {
              value: `Payments #${paymentNumber}`
            }
          ],
          // Customer Link
          customfield_10074: `https://backoffice.ualett.com/user/${user._id}/cashadvance`,
          // Customer ID
          customfield_10075: `${user._id}`,
          // Error Codes
          customfield_10076: [
            {
              value: `${returnCode}`
            }
          ],
          // Customer Name
          customfield_10077: `${user.firstName} ${user.lastName}`.toUpperCase(),
          // Customer phone number
          customfield_10078: `${user.phone.number}`,
          // Amount of declines
          customfield_10082: 1,
          // Paid Payments
          customfield_10083: [{ value: 'NONE' }]
        }
      };

      const res = await axios.post(jiraUrl, JSON.stringify(DATA), jiraConfig);

      if (res.status !== 201) throw new Meteor.Error('ISSUE_NOT_CREATED!');

      await Tasks.insertAsync({
        colName: 'deals',
        issueId: res.data.id,
        issueKey: res.data.key,
        typeOfIssue,
        docId: deal._id,
        createdAt: new Date(),
        metadata: {
          numberOfDeclinedPayments: 1,
          declinedPayments: [
            {
              number: paymentNumber,
              code: returnCode,
              paid: false
            }
          ]
        }
      });
    }

    return true;
  } catch (error) {
    const typedError = error as Error;
    if (typedError.message === 'TASK_ALREADY_EXISTS!') {
      return true;
    }
    logger.error(`[FUNCTION:createOrUpdateODTask] ${error}`);
    throw new Meteor.Error('Error creating or updating Task.');
  }
}
