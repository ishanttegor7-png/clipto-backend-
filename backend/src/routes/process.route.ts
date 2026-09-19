import { Router, Request, Response } from 'express';
import { validateAutoClipRequest, validateCustomClipRequest } from '../utils/validators.js';
import { jobManager } from '../jobs/jobManager.js';
import { JobStatusResponse } from '../jobs/types.js';

export const processRouter = Router();

/**
 * POST /api/process/auto
 *
 * Slices a video into sequential 60-second clips (up to batchSize, max 5).
 * Enforces maximum video length limit of 30 minutes.
 * Returns immediately with jobId for asynchronous processing.
 */
processRouter.post('/auto', (req: Request, res: Response) => {
  const validation = validateAutoClipRequest(req.body);

  if (!validation.valid || !validation.data) {
    res.status(400).json({
      error: validation.error || 'Invalid request parameters for auto-clipping',
    });
    return;
  }

  const job = jobManager.createAutoJob(validation.data);

  res.status(202).json({
    jobId: job.jobId,
    status: job.status,
    message: 'Auto-clip job successfully queued for processing',
  });
});

/**
 * POST /api/process/custom
 *
 * Slices a custom segment up to 60 seconds long.
 * Rejects any request with duration > 60 seconds.
 * Returns immediately with jobId for asynchronous processing.
 */
processRouter.post('/custom', (req: Request, res: Response) => {
  const validation = validateCustomClipRequest(req.body);

  if (!validation.valid || !validation.data) {
    res.status(400).json({
      error: validation.error || 'Invalid request parameters for custom clipping',
    });
    return;
  }

  const job = jobManager.createCustomJob(validation.data);

  res.status(202).json({
    jobId: job.jobId,
    status: job.status,
    message: 'Custom-clip job successfully queued for processing',
  });
});

/**
 * GET /api/process/status/:jobId
 *
 * Retrieves current job execution status and clip download URLs when completed.
 */
processRouter.get('/status/:jobId', (req: Request, res: Response) => {
  const { jobId } = req.params;

  if (!jobId) {
    res.status(400).json({ error: 'jobId parameter is required' });
    return;
  }

  const job = jobManager.getJob(jobId);

  if (!job) {
    res.status(404).json({
      error: `Job with ID '${jobId}' was not found. Note that temporary job records expire after completion.`,
    });
    return;
  }

  const response: JobStatusResponse = {
    jobId: job.jobId,
    status: job.status,
    clips: job.clips.map((clip) => ({
      clipNumber: clip.clipNumber,
      startTime: clip.startTime,
      endTime: clip.endTime,
      downloadUrl: clip.downloadUrl,
    })),
    error: job.error,
  };

  res.status(200).json(response);
});
