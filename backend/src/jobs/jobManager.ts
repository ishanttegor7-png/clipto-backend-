import { randomUUID } from 'crypto';
import fs from 'fs';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { ffmpegService } from '../services/ffmpeg.service.js';
import { storageService } from '../services/storage.service.js';
import { youtubeService } from '../services/youtube.service.js';
import { ClipResult, Job, JobStatus, JobType } from './types.js';

export interface CreateAutoJobParams {
  sourceUrl: string;
  batchStartSeconds: number;
  batchSize: number;
}

export interface CreateCustomJobParams {
  sourceUrl: string;
  startSeconds: number;
  endSeconds: number;
}

export class JobManager {
  private jobs: Map<string, Job> = new Map();
  private isProcessing: boolean = false;
  private queue: string[] = [];
  private jobPurgeTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startJobPurgeScheduler();
  }

  /**
   * Enqueues an Auto-Clip job.
   */
  public createAutoJob(params: CreateAutoJobParams): Job {
    const jobId = randomUUID();
    const job: Job = {
      jobId,
      type: 'auto',
      status: 'queued',
      sourceUrl: params.sourceUrl,
      batchStartSeconds: params.batchStartSeconds,
      batchSize: params.batchSize,
      clips: [],
      error: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.jobs.set(jobId, job);
    this.queue.push(jobId);
    logger.info(`Enqueued auto-clip job ${jobId} (batchStart: ${params.batchStartSeconds}s, size: ${params.batchSize})`, 'JobManager');

    // Trigger queue runner asynchronously
    setImmediate(() => this.processNext());

    return job;
  }

  /**
   * Enqueues a Custom-Clip job.
   */
  public createCustomJob(params: CreateCustomJobParams): Job {
    const jobId = randomUUID();
    const job: Job = {
      jobId,
      type: 'custom',
      status: 'queued',
      sourceUrl: params.sourceUrl,
      startSeconds: params.startSeconds,
      endSeconds: params.endSeconds,
      clips: [],
      error: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.jobs.set(jobId, job);
    this.queue.push(jobId);
    logger.info(`Enqueued custom-clip job ${jobId} (${params.startSeconds}s -> ${params.endSeconds}s)`, 'JobManager');

    // Trigger queue runner asynchronously
    setImmediate(() => this.processNext());

    return job;
  }

  /**
   * Retrieves a job by ID.
   */
  public getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Internal queue processor.
   * Modular design allows replacing this with Redis/BullMQ worker in production.
   */
  private async processNext(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    const nextJobId = this.queue.shift();
    if (!nextJobId) return;

    const job = this.jobs.get(nextJobId);
    if (!job) {
      return this.processNext();
    }

    this.isProcessing = true;
    job.status = 'processing';
    job.updatedAt = Date.now();
    logger.info(`Starting execution for job ${job.jobId} (type: ${job.type})`, 'JobManager');

    let sourceFilePath: string | null = null;

    try {
      // 1. Obtain authorized source video
      const mediaResult = await youtubeService.obtainSourceMedia(job.sourceUrl, job.jobId);
      sourceFilePath = mediaResult.filePath;

      // 2. Probe media duration and properties using FFmpeg/ffprobe
      const metadata = await ffmpegService.probeVideo(sourceFilePath);
      const videoDuration = metadata.duration || mediaResult.durationSeconds;

      logger.info(`Source video duration: ${videoDuration}s (max allowed: ${config.maxVideoLengthSeconds}s)`, 'JobManager');

      // 3. Enforce maximum source video length rule (30 minutes)
      if (videoDuration > config.maxVideoLengthSeconds) {
        throw new Error(
          `Video duration (${Math.round(videoDuration)}s) exceeds maximum allowed length of ${config.maxVideoLengthSeconds}s (30 minutes)`
        );
      }

      // 4. Calculate clip boundaries
      const clipRanges: Array<{ clipNumber: number; start: number; end: number; duration: number }> = [];

      if (job.type === 'auto') {
        const batchStart = job.batchStartSeconds || 0;
        const batchSize = Math.min(job.batchSize || 5, 5);

        for (let i = 0; i < batchSize; i++) {
          const start = batchStart + i * config.maxClipLengthSeconds;
          if (start >= videoDuration) break;

          const end = Math.min(start + config.maxClipLengthSeconds, videoDuration);
          const duration = end - start;
          if (duration <= 0) break;

          clipRanges.push({
            clipNumber: i + 1,
            start,
            end,
            duration,
          });
        }
      } else {
        // Custom clip
        const start = job.startSeconds || 0;
        const end = Math.min(job.endSeconds || start + config.maxClipLengthSeconds, videoDuration);
        const duration = end - start;

        if (duration <= 0) {
          throw new Error(`Invalid custom range: start (${start}s) is greater than or equal to video end (${end}s)`);
        }

        if (duration > config.maxClipLengthSeconds) {
          throw new Error(`Custom clip duration (${duration}s) exceeds maximum allowed limit of ${config.maxClipLengthSeconds}s`);
        }

        clipRanges.push({
          clipNumber: 1,
          start,
          end,
          duration,
        });
      }

      if (clipRanges.length === 0) {
        throw new Error('No valid clip ranges could be determined within video boundaries');
      }

      // 5. Execute FFmpeg cuts for each clip
      const generatedClips: ClipResult[] = [];

      for (const range of clipRanges) {
        const clipFilename = `clip_${job.jobId}_${range.clipNumber}.mp4`;
        const clipOutputPath = storageService.getClipFilePath(job.jobId, range.clipNumber, 'mp4');

        logger.info(
          `Cutting clip ${range.clipNumber}: ${range.start}s to ${range.end}s (duration: ${range.duration}s)`,
          'JobManager'
        );

        await ffmpegService.cutClip({
          inputPath: sourceFilePath,
          outputPath: clipOutputPath,
          startTime: range.start,
          duration: range.duration,
        });

        // Compute file stats
        let fileSizeMb: number | undefined;
        try {
          const stats = fs.statSync(clipOutputPath);
          fileSizeMb = Number((stats.size / (1024 * 1024)).toFixed(2));
        } catch {
          // ignore stat error
        }

        generatedClips.push({
          clipNumber: range.clipNumber,
          startTime: range.start,
          endTime: range.end,
          duration: range.duration,
          downloadUrl: `/api/download/${clipFilename}`,
          filename: clipFilename,
          fileSizeMb,
        });
      }

      // 6. Delete the large source file immediately after clipping to preserve temporary storage
      if (sourceFilePath) {
        storageService.deleteFile(sourceFilePath);
        sourceFilePath = null;
      }

      // 7. Mark job as completed
      job.status = 'completed';
      job.clips = generatedClips;
      job.error = null;
      job.completedAt = Date.now();
      job.updatedAt = Date.now();

      logger.info(`Job ${job.jobId} completed successfully with ${generatedClips.length} clips`, 'JobManager');
    } catch (err: any) {
      logger.error(`Job ${job.jobId} failed: ${err.message}`, 'JobManager');

      // Cleanup source file on failure
      if (sourceFilePath) {
        storageService.deleteFile(sourceFilePath);
      }

      job.status = 'failed';
      job.error = err.message || 'Video processing failed';
      job.updatedAt = Date.now();
    } finally {
      this.isProcessing = false;
      // Continue processing next queued job
      setImmediate(() => this.processNext());
    }
  }

  /**
   * Purges old completed/failed job records from in-memory store after 2 hours.
   */
  private startJobPurgeScheduler(): void {
    const purgeInterval = 10 * 60 * 1000; // check every 10 minutes
    const maxJobAge = 2 * 60 * 60 * 1000; // 2 hours

    this.jobPurgeTimer = setInterval(() => {
      const now = Date.now();
      for (const [id, job] of this.jobs.entries()) {
        if ((job.status === 'completed' || job.status === 'failed') && now - job.updatedAt > maxJobAge) {
          this.jobs.delete(id);
          logger.debug(`Purged old job record from memory: ${id}`, 'JobManager');
        }
      }
    }, purgeInterval);
  }

  public stopScheduler(): void {
    if (this.jobPurgeTimer) {
      clearInterval(this.jobPurgeTimer);
      this.jobPurgeTimer = null;
    }
  }
}

export const jobManager = new JobManager();
