import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { PLAID_CLIENT_ID, PLAID_ENVIRONMENT, PLAID_SECRET } from '../keys';

const configuration = new Configuration({
  basePath: PlaidEnvironments[PLAID_ENVIRONMENT],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
      'PLAID-SECRET': PLAID_SECRET
    }
  }
});

const client = new PlaidApi(configuration);

export default client;
