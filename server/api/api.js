import { Meteor } from 'meteor/meteor';
import { WebApp } from 'meteor/webapp';
import express from 'express';
import helmet from 'helmet';
import Sentry from '@sentry/node';

const app = express();

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

app.set('trust proxy', 1);

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type,Content-Disposition, Accept, token, secret, daterange, firstdate, lastdate, enddate, startdate, filter, agent, next, previous, dealdateoperator, status, userid'
  );
  next();
});

app.use(helmet());

app.use(Sentry.Handlers.errorHandler());

WebApp.connectHandlers.use(Meteor.bindEnvironment(app));
export default app;
export const API = app;
