import { JIRA_API_KEY, JIRA_BASE_URL, JIRA_EMAIL_AUTH } from '../../keys';

export const jiraUrl = `${JIRA_BASE_URL}/issue`;

export const jiraConfig = {
  headers: {
    Authorization: `Basic ${Buffer.from(`${JIRA_EMAIL_AUTH}:${JIRA_API_KEY}`).toString('base64')}`,
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }
};
