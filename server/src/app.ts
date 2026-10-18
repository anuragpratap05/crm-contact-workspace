import express from 'express';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import { apiRouter } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';
import { env } from './config/env.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req) => req.url?.startsWith('/api/health') ?? false,
      },
    }),
  );

  app.use(cors({ origin: env.corsOrigins }));
  app.use(express.json({ limit: '100kb' }));

  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
