import pino from 'pino';
import { config } from './config';

export const logger = pino({
  level: config.NODE_ENV === 'development' ? 'debug' : 'info',
  transport: config.NODE_ENV === 'development'
    ? { target: 'pino/file', options: { destination: 1 } }
    : undefined,
});
