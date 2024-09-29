import Queue from './queue/queue';
import agenda from './agenda/agenda';
import { MongoInternals } from 'meteor/mongo';
import logger from './logger/log';

const mongoDriver = MongoInternals.defaultRemoteCollectionDriver().mongo;

async function gracefulShutdown() {
  const TIMEOUT = 10000;
  logger.info('Shutting down gracefully...');

  const timeout = setTimeout(() => {
    logger.info('Forcefully shutting down...');
    process.exit(0);
  }, TIMEOUT);

  await Queue.stop();
  await agenda.stop();


  mongoDriver.client.close().then(() => {
    clearTimeout(timeout);
    logger.info('MongoDB connection closed.');
    process.exit(0);
  }).catch((error) => {
    logger.error('Error al cerrar la conexión a MongoDB:', error);
  });
}


process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
