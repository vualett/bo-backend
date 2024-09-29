import { API_IP_WHITELIST } from '../../keys';

const IPWhiteListCheck = (req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  if (JSON.parse(API_IP_WHITELIST ?? '').indexOf(ip) !== -1) {
    next();
  } else {
    res.status(401).send(
      JSON.stringify({
        status: 'error',
        error: 'not-authorized'
      })
    );
  }
};

export default IPWhiteListCheck;
