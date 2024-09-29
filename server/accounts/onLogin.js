import { Accounts } from 'meteor/accounts-base';
import AccessLogs from '../collections/accessLogs';

Accounts.onLogin((login) => {
  const { user, type, connection } = login;

  const log = {
    userID: user._id,
    userType: user.type,
    loginType: type,
    IP: connection.clientAddress,
    userAgent: connection.httpHeaders['user-agent'],
    host: connection.httpHeaders.host,
    timestamp: new Date()
  };

  if (user.isAdmin && type === 'resume') return;

  AccessLogs.insert(log);
});
