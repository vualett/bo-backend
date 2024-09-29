import { Meteor } from 'meteor/meteor';
import logger from '../../logger/log';
import axios from 'axios';
import { JIRA_API_KEY, JIRA_BASE_URL, JIRA_EMAIL_AUTH, JIRA_PROJECT_KEY } from '../../keys';

interface Parameters {
  title: string;
  description: string;
  userId: string;
}

const createIssue = async ({ title, description, userId }: Parameters): Promise<void> | never => {
  const authorizationHeader = `Basic ${Buffer.from(`${JIRA_EMAIL_AUTH}:${JIRA_API_KEY}`).toString('base64')}`;
  const apiUrl = `${JIRA_BASE_URL}/issue`;

  const data = {
    fields: {
      project: {
        key: JIRA_PROJECT_KEY
      },
      summary: title,
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: description
              }
            ]
          }
        ]
      },
      customfield_10079: `https://backoffice.ualett.com/user/${userId}`,
      issuetype: {
        name: 'Task'
      }
    }
  };

  try {
    return await axios.post(apiUrl, data, {
      headers: {
        Authorization: authorizationHeader
      }
    });
  } catch (e) {
    logger.error(`[FUNCTION:createIssue] ${e}`);
    throw new Meteor.Error('Error creating issue.');
  }
};

export default createIssue;
