import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { logger } from './utils/logger.js';
import { healthRouter } from './routes/health.route.js';
import { processRouter } from './routes/process.route.js';
import { downloadRouter } from './routes/download.route.js';
import { ffmpegService } from './services/ffmpeg.service.js';
import { storageService } from './services/storage.service.js';
import { jobManager } from './jobs/jobManager.js';

export function createApp() {
  const app = express();

  // 1. CORS Configuration using FRONTEND_URL environment variable
  const corsOrigin = config.frontendUrl === '*' ? true : config.frontendUrl;
  app.use(
    cors({
      origin: corsOrigin,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    })
  );

  // 2. Request body parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // 3. HTTP Request Logging Middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`, 'HTTP');
    });
    next();
  });

  // 4. API Routes
  // Health check
  app.use('/health', healthRouter);

  // Video processing routes
  app.use('/api/process', processRouter);

  // Temporary clip downloads
  app.use('/api/download', downloadRouter);

  // Root information endpoint
  app.get('/', (req: Request, res: Response) => {
    res.status(200).json({
      name: 'Clipto Video Processing API',
      version: '1.0.0',
      description: 'Asynchronous YouTube video clipping backend service',
      status: 'operational',
      endpoints: {
        health: 'GET /health',
        autoClip: 'POST /api/process/auto',
        customClip: 'POST /api/process/custom',
        status: 'GET /api/process/status/:jobId',
        download: 'GET /api/download/:filename',
      },
    });
  });

  // 5. 404 Route Not Found Handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: `Endpoint '${req.method} ${req.originalUrl}' not found on Clipto backend`,
    });
  });

  // 6. Global Error Handler
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    logger.error('Unhandled application exception', 'Server', err);
    res.status(500).json({
      error: 'An internal server error occurred',
      message: config.nodeEnv === 'development' ? err.message : undefined,
    });
  });

  return app;
}

export async function startServer() {
  const app = createApp();

  // Verify FFmpeg binary
  const hasFFmpeg = await ffmpegService.isAvailable();
  if (hasFFmpeg) {
    logger.info('FFmpeg binary verified and ready', 'Startup');
  } else {
    logger.warn('FFmpeg binary not detected in PATH. Media processing operations will fail unless installed.', 'Startup');
  }

  // Ensure temporary storage directory exists
  storageService.ensureTempDir();

  const server = app.listen(config.port, '0.0.0.0', () => {
    logger.info(`Clipto Backend API listening on http://0.0.0.0:${config.port}`, 'Startup');
    logger.info(`Frontend URL allowed by CORS: ${config.frontendUrl}`, 'Startup');
    logger.info(`Temp file retention: ${config.tempFileTtlMinutes} minutes`, 'Startup');
    logger.info(`Max video length: ${config.maxVideoLengthSeconds}s, Max clip length: ${config.maxClipLengthSeconds}s`, 'Startup');
  });

  // Graceful shutdown handling
  const shutdown = (signal: string) => {
    logger.info(`Received ${signal}. Gracefully shutting down...`, 'Shutdown');
    storageService.stopCleanupScheduler();
    jobManager.stopScheduler();
    server.close(() => {
      logger.info('Server closed. Process terminating cleanly.', 'Shutdown');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return server;
}

// Auto-start server when run directly
if (process.argv[1]?.endsWith('server.js') || process.argv[1]?.endsWith('server.ts')) {
  startServer().catch((err) => {
    logger.error('Fatal startup error', 'Startup', err);
    process.exit(1);
  });
}
