/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import axios from 'axios';
import Tasks from '../../../collections/tasks';
import { Meteor } from 'meteor/meteor';
import * as Sentry from '@sentry/node';
import logger from '../../../logger/log';
import { jiraUrl, jiraConfig } from '../config';
import { findODTask } from './findODTask';
import { JIRA_OVERDUE } from '../../../keys';

interface PARAMS {
  dealID: string;
  user: Meteor.User;
  paymentNumber: number;
}

export async function addPaidToODTask(params: PARAMS): Promise<boolean | undefined> {
  const { dealID, user, paymentNumber } = params;

  try {
    const foundTask = await findODTask(dealID);

    const isPaymentNumberDeclined = foundTask?.task?.metadata?.declinedPayments?.find(
      (dp) => dp.number === paymentNumber
    );

    if (!isPaymentNumberDeclined) return false;

    if (foundTask?.issueStatus) {
      const UPDATE_TITLE = 'Overdue Task For Payment Declination';
      const UPDATE_DESCRIPTION = `A Declined payment has been paid in Deal with ID "${foundTask.task.docId}" payment #${paymentNumber}.`;

      const DECLINE_PAYMENT_LIST = foundTask.task.metadata?.declinedPayments?.map((i) => {
        return {
          value: `Payments #${i.number}`
        };
      });

      const DECLINE_CODES_LIST = foundTask.task.metadata?.declinedPayments?.map((i) => {
        return {
          value: `${i.code}`
        };
      });

      const PAID_PAYMENT_LIST = foundTask.task.metadata?.declinedPayments?.length
        ? foundTask.task.metadata?.declinedPayments
            ?.filter((i) => i.paid)
            .map((j) => {
              return {
                value: `Payment #${j.number}`
              };
            })
        : [];

      PAID_PAYMENT_LIST.push({
        // adding the latest paid
        value: `Payment #${paymentNumber}`
      });

      const NUMBER_OF_DECLINED_PAYMENTS = foundTask.task.metadata.numberOfDeclinedPayments;

      const DATA = {
        issuetype: {
          name: foundTask.task.typeOfIssue
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

      const res = await axios.put(`${jiraUrl}/${foundTask.task.issueId}`, JSON.stringify(DATA), jiraConfig);

      if (res.status !== 204) throw new Meteor.Error('TASK_NOT_UPDATED!');

      await Tasks.updateAsync(
        { _id: foundTask.task._id, 'metadata.declinedPayments.number': paymentNumber },
        {
          $set: {
            'metadata.declinedPayments.$.paid': true
          }
        }
      );
    } else if (foundTask?.task) {
      const UPDATE_TITLE = 'Overdue Task For Payment Declination';
      const UPDATE_DESCRIPTION = `A Declined payment has been paid in Deal with ID "${foundTask.task.docId}" payment #${paymentNumber}.`;

      const DECLINE_PAYMENT_LIST = foundTask.task.metadata?.declinedPayments?.map((i) => {
        return {
          value: `Payments #${i.number}`
        };
      });

      const DECLINE_CODES_LIST = foundTask.task.metadata?.declinedPayments?.map((i) => {
        return {
          value: `${i.code}`
        };
      });

      const PAID_PAYMENT_LIST = foundTask.task.metadata?.declinedPayments?.length
        ? foundTask.task.metadata?.declinedPayments
            ?.filter((i) => i.paid)
            .map((j) => {
              return {
                value: `Payment #${j.number}`
              };
            })
        : [];

      PAID_PAYMENT_LIST.push({
        // adding the latest paid
        value: `Payment #${paymentNumber}`
      });

      const NUMBER_OF_DECLINED_PAYMENTS = foundTask.task.metadata.numberOfDeclinedPayments;

      const DATA = {
        fields: {
          project: {
            key: JIRA_OVERDUE
          },
          issuetype: {
            name: foundTask.task.typeOfIssue
          },
          summary: UPDATE_TITLE,
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

      const res = await axios.post(jiraUrl, JSON.stringify(DATA), jiraConfig);

      if (res.status !== 201) throw new Meteor.Error('ISSUE_NOT_CREATED!');

      await Tasks.updateAsync(
        { _id: foundTask.task._id, 'metadata.declinedPayments.number': paymentNumber },
        {
          $set: {
            issueId: res.data.id,
            issueKey: res.data.key,
            'metadata.declinedPayments.$.paid': true
          }
        }
      );
    }

    return true;
  } catch (error) {
    Sentry.captureException(error);
    logger.error(`[FUNCTION:addPaidToODTask] ${error}`);
    throw new Meteor.Error('Error updating Task.');
  }
}
