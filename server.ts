import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './src/server/routes/api';
import { errorHandler } from './src/server/middleware/errorHandler';
import { logger } from './src/server/logger';
import { config } from './src/server/config';

const app = express();

// Security Hardening: Disable X-Powered-By header
app.disable('x-powered-by');

// Security Response Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Global Middlewares
app.use(express.json({ limit: config.maxPayloadSize }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const correlationId = (req.headers['x-correlation-id'] as string) || `REQ-${Math.floor(10000 + Math.random() * 90000)}`;
  res.setHeader('x-correlation-id', correlationId);

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`, undefined, correlationId);
  });

  next();
});

// Mount API Routes
app.use('/api', apiRouter);

// Centralized Error Handler for API
app.use(errorHandler);

// Vite middleware & Static SPA Serving
async function startServer() {
  if (config.nodeEnv !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(config.port, '0.0.0.0', () => {
    logger.info(`Insurance Claim Prediction Platform server running at http://0.0.0.0:${config.port} [env=${config.nodeEnv}]`);
  });
}

startServer();
