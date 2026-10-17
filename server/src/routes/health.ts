import { Router } from 'express';
import mongoose from 'mongoose';

export const healthRouter = Router();

const CONNECTION_STATES: Record<number, string> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
  99: 'uninitialized',
};

healthRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

healthRouter.get('/health/ready', (_req, res) => {
  const state = mongoose.connection.readyState;
  const isReady = state === 1;

  res.status(isReady ? 200 : 503).json({
    status: isReady ? 'ready' : 'not_ready',
    database: CONNECTION_STATES[state] ?? 'unknown',
  });
});
