import { EXPORT_METHOD_SECRET } from '../../keys';

const tokenCheck = (req, res, next) => {
  const { token } = req.headers;
  if (EXPORT_METHOD_SECRET === token) {
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
export default tokenCheck;
