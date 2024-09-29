/* eslint-disable @typescript-eslint/restrict-template-expressions */
import axios from 'axios';
import { Meteor } from 'meteor/meteor';
import logger from '../../../logger/log';
import { jiraUrl, jiraConfig } from '../config';

// TO KNOW THE TRANSITIONS IDs USE await axios.get(`${jiraUrl}/${task.issueId}/transitions`, jiraConfig);

export async function updateStatusODTask(issueID: string, id?: number): Promise<boolean> {
  try {
    let transitionId = 0;

    switch (id) {
      case 10067: // DEAL FINISHED
        transitionId = 14;
        break;
      case 10066: // FAILED RESCHEDULE
        transitionId = 13;
        break;
      case 10065: // NOT WORKABLE
        transitionId = 12;
        break;
    }

    const data = {
      transition: {
        id: transitionId
      }
    };

    const res = await axios.post(`${jiraUrl}/${issueID}/transitions`, JSON.stringify(data), jiraConfig);

    if (res.status === 204) return true;

    return false;
  } catch (error) {
    logger.error(`[FUNCTION:updateStatusODTask] ${error}`);
    throw new Meteor.Error('Error updating status Task.');
  }
}
