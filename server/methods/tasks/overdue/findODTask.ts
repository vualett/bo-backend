/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import axios from 'axios';
import Tasks from '../../../collections/tasks';
import { Meteor } from 'meteor/meteor';
import logger from '../../../logger/log';
import { jiraUrl, jiraConfig } from '../config';

export async function findODTask(
  dealID: string
): Promise<{ task: Meteor.Task; issueStatus?: number; transitionId?: number } | undefined> {
  const task = await Tasks.findOneAsync({ docId: dealID });

  if (!task) return undefined;

  try {
    const res = await axios.get(`${jiraUrl}/${task.issueId}`, jiraConfig);

    if (res.status === 200) {
      const issueStatus = parseInt(res.data.fields.status.statusCategory.id);
      const transitionId = parseInt(res.data.fields.status.id);

      return {
        task,
        issueStatus,
        transitionId
      };
    }

    return { task };
  } catch (error) {
    logger.error(`[FUNCTION:findODTask] ${error}`);
    return { task };
  }
}
