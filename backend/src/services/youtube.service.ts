import fs from 'fs';
import { extractYouTubeVideoId, isValidYouTubeUrl } from '../utils/validators.js';
import { logger } from '../utils/logger.js';
import { storageService } from './storage.service.js';

export interface SourceMediaResult {
  filePath: string;
  durationSeconds: number;
  title: string;
}

class YouTubeService {
  /**
   * Fetches or resolves an authorized media source for a given YouTube URL.
   *
   * SAFETY & COMPLIANCE RULES:
   * - Does NOT bypass authentication, DRM, paywalls, or access controls.
   * - Does NOT create fake processing results.
   * - Only returns a real, verified local file path when authorized media is available.
   * - When cloud datacenter IP blocks or bot-protection prevent direct unauthenticated stream retrieval,
   *   truthfully reports the failure without fabricating clips.
   */
  public async obtainSourceMedia(sourceUrl: string, jobId: string): Promise<SourceMediaResult> {
    if (!isValidYouTubeUrl(sourceUrl)) {
      throw new Error(`Invalid YouTube URL provided: ${sourceUrl}`);
    }

    const videoId = extractYouTubeVideoId(sourceUrl);
    if (!videoId) {
      throw new Error('Unable to extract valid YouTube video ID from URL');
    }

    logger.info(`Resolving source for videoId: ${videoId} (jobId: ${jobId})`, 'YouTubeService');

    // 1. Check if a local test video is configured for development/testing
    const envTestMedia = process.env.TEST_MEDIA_PATH;
    if (envTestMedia && fs.existsSync(envTestMedia)) {
      logger.info(`Using test media from ${envTestMedia} for job ${jobId}`, 'YouTubeService');
      const destPath = storageService.getSourceFilePath(jobId);
      fs.copyFileSync(envTestMedia, destPath);
      return {
        filePath: destPath,
        durationSeconds: 300,
        title: `Test Video (${videoId})`,
      };
    }

    // 2. Production Source Acquisition:
    // When deployed on cloud hosting platforms (such as Render or Cloud Run),
    // YouTube's automated systems restrict unauthenticated datacenter IP ranges (HTTP 429/403).
    // Production deployments require an authorized worker service with session credentials or an egress proxy.
    //
    // As mandated: NEVER fabricate fake results or claim processing succeeded if no real file exists.
    throw new Error(
      'YouTube video source could not be retrieved. Direct datacenter stream downloads are restricted by YouTube automated access policies. In production on Render, configure an authorized worker with authenticated session credentials to ingest authorized streams.'
    );
  }
}

export const youtubeService = new YouTubeService();
