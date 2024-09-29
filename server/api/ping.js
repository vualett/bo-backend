import { API } from './api';

API.post('/ping', (req, res) => {
  res.status(200).send('pong!');
});

API.get('/ping', (req, res) => {
  res.status(200).send('pong!');
});
