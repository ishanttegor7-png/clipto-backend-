import express from 'express';
import path from 'path';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import {
  createAutoClipJob,
  createCustomClipJob,
  getJobById,
  fetchYouTubeMetadata,
  isValidYouTubeUrl,
} from './server/videoProcessor';
import { getTempFilePath } from './server/tempStorage';

async function startServer() {
  const app = express();
  const PORT = 3000;

  const allowedOrigin = process.env.FRONTEND_URL === '*' || !process.env.FRONTEND_URL ? true : process.env.FRONTEND_URL;
  app.use(cors({ origin: allowedOrigin, credentials: true }));
  app.use(express.json());

  // Health check - GET /health
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'clipto-backend' });
  });

  // Health check - GET /api/health
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'clipto-backend', timestamp: Date.now() });
  });

  // Validate and get YouTube metadata
  app.get('/api/video/metadata', async (req, res) => {
    const url = (req.query.url as string) || (req.query.sourceUrl as string);
    if (!url || !isValidYouTubeUrl(url)) {
      return res.status(400).json({ error: 'Please provide a valid YouTube video URL.' });
    }

    try {
      const meta = await fetchYouTubeMetadata(url);
      return res.json(meta);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to retrieve YouTube video details.' });
    }
  });

  // POST /api/process/auto
  app.post('/api/process/auto', async (req, res) => {
    try {
      const sourceUrl = req.body.sourceUrl || req.body.youtubeUrl;
      if (!sourceUrl || !isValidYouTubeUrl(sourceUrl)) {
        return res.status(400).json({ error: 'Valid sourceUrl is required for auto-clipping.' });
      }

      const batchStartSeconds = req.body.batchStartSeconds !== undefined
        ? Number(req.body.batchStartSeconds)
        : (req.body.batchIndex || 0) * 300;
      const batchSize = req.body.batchSize !== undefined ? Number(req.body.batchSize) : 5;

      if (batchSize < 1 || batchSize > 5) {
        return res.status(400).json({ error: 'batchSize must be between 1 and 5 clips.' });
      }

      const job = await createAutoClipJob({
        ...req.body,
        youtubeUrl: sourceUrl,
        batchIndex: Math.floor(batchStartSeconds / 300),
      });

      return res.status(202).json({
        jobId: job.jobId,
        status: job.status,
        message: 'Auto-clip job successfully queued for sequential processing.',
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to start auto-clip processing.' });
    }
  });

  // POST /api/process/custom
  app.post('/api/process/custom', async (req, res) => {
    try {
      const sourceUrl = req.body.sourceUrl || req.body.youtubeUrl;
      if (!sourceUrl || !isValidYouTubeUrl(sourceUrl)) {
        return res.status(400).json({ error: 'Valid sourceUrl is required for custom clipping.' });
      }

      const startSeconds = req.body.startSeconds !== undefined
        ? Number(req.body.startSeconds)
        : req.body.startTimeSeconds !== undefined
        ? Number(req.body.startTimeSeconds)
        : 0;

      const endSeconds = req.body.endSeconds !== undefined
        ? Number(req.body.endSeconds)
        : req.body.endTimeSeconds !== undefined
        ? Number(req.body.endTimeSeconds)
        : 60;

      const duration = endSeconds - startSeconds;
      if (duration > 60) {
        return res.status(400).json({ error: 'Maximum clip duration cannot exceed 60 seconds.' });
      }

      if (duration <= 0) {
        return res.status(400).json({ error: 'End time must be strictly greater than start time.' });
      }

      const job = await createCustomClipJob({
        ...req.body,
        youtubeUrl: sourceUrl,
        startTimeSeconds: startSeconds,
        endTimeSeconds: endSeconds,
      });

      return res.status(202).json({
        jobId: job.jobId,
        status: job.status,
        message: 'Custom clip job successfully queued for processing.',
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to start custom clip processing.' });
    }
  });

  // GET /api/process/status/:jobId
  app.get('/api/process/status/:jobId', (req, res) => {
    const job = getJobById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found or expired from temporary queue.' });
    }

    return res.json({
      jobId: job.jobId,
      status: job.status,
      clips: job.clips || [],
      downloadUrl: job.downloadUrl,
      startTime: job.startTime,
      endTime: job.endTime,
      error: job.error,
    });
  });

  // GET /api/download/:clipId
  app.get('/api/download/:clipId', (req, res) => {
    const filename = req.params.clipId;
    const filePath = getTempFilePath(filename);

    if (!filePath) {
      return res.status(404).json({
        error: 'Temporary clip file expired or not found. Clipto stores generated clips temporarily.',
      });
    }

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.sendFile(filePath);
  });

  // POST /api/user/verify-subscription
  // Authoritative server-side verification of user's subscription status and expiry
  app.post('/api/user/verify-subscription', async (req, res) => {
    const { userId, plan, subscriptionExpiry, subscriptionStatus } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required for subscription verification.' });
    }

    const authHeader = req.headers.authorization;
    let idToken: string | undefined;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      idToken = authHeader.substring(7);
    }

    try {
      const { verifyServerUserSubscription } = await import('./server/subscriptionManager');
      const verified = await verifyServerUserSubscription({
        userId,
        plan,
        subscriptionExpiry,
        subscriptionStatus,
        idToken,
      });
      return res.json(verified);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Subscription verification failed.' });
    }
  });

  // POST /api/subscription/initiate
  // Isolated placeholder for future payment gateway (Razorpay, Stripe, etc.)
  app.post('/api/subscription/initiate', (req, res) => {
    const { planId, amountInr, userId } = req.body;
    return res.json({
      status: 'pending_gateway_connection',
      planId,
      amountInr,
      userId,
      message: 'Payment gateway hook registered. Real payment provider integration pending.',
    });
  });

  // POST /api/dev/set-test-subscription
  // Developer/QA tool to calculate subscription states (e.g., active or expired) for testing
  app.post('/api/dev/set-test-subscription', (req, res) => {
    const { userId, state } = req.body; // state: 'active_weekly' | 'active_monthly' | 'expired' | 'free'
    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    let plan = 'free';
    let subscriptionStatus = 'none';
    let subscriptionExpiry: string | null = null;

    if (state === 'active_weekly') {
      plan = 'premium';
      subscriptionStatus = 'active';
      subscriptionExpiry = new Date(Date.now() + 7 * 86400000).toISOString();
    } else if (state === 'active_monthly') {
      plan = 'premium';
      subscriptionStatus = 'active';
      subscriptionExpiry = new Date(Date.now() + 30 * 86400000).toISOString();
    } else if (state === 'expired') {
      plan = 'premium';
      subscriptionStatus = 'active';
      // Set expiry in the past (1 day ago) to test automatic transition to Free
      subscriptionExpiry = new Date(Date.now() - 86400000).toISOString();
    } else {
      plan = 'free';
      subscriptionStatus = 'none';
      subscriptionExpiry = null;
    }

    return res.json({ success: true, plan, subscriptionStatus, subscriptionExpiry });
  });

  // Vite middleware for development vs static build for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Clipto server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
