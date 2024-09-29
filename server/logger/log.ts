import winston from 'winston';

const transports = [
  new winston.transports.Console(),
];

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'white'
};

winston.addColors(colors);


const logger = winston.createLogger({
  levels,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize({ all: true }),
    winston.format.printf((info: winston.Logform.TransformableInfo) => `${info.timestamp as string} [${info.level}] ${info.message as string}`)
  ),
  transports
});

export default logger;
