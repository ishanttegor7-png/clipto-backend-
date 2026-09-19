import fs from 'fs';
import path from 'path';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

class StorageService {
  private tempDir: string;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.tempDir = config.tempDir;
    this.ensureTempDir();
    this.startCleanupScheduler();
  }

  /**
   * Ensures the temporary storage directory exists.
   */
  public ensureTempDir(): void {
    if (!fs.existsSync(this.tempDir)) {
      try {
        fs.mkdirSync(this.tempDir, { recursive: true, mode: 0o755 });
        logger.info(`Temporary storage directory initialized at: ${this.tempDir}`, 'StorageService');
      } catch (err) {
        logger.error(`Failed to create temp directory ${this.tempDir}`, 'StorageService', err);
      }
    }
  }

  /**
   * Generates a temporary file path for a source download.
   */
  public getSourceFilePath(jobId: string, ext: string = 'mp4'): string {
    const safeJobId = jobId.replace(/[^a-zA-Z0-9_-]/g, '');
    return path.join(this.tempDir, `source_${safeJobId}.${ext}`);
  }

  /**
   * Generates a temporary file path for a generated clip.
   */
  public getClipFilePath(jobId: string, clipNumber: number, ext: string = 'mp4'): string {
    const safeJobId = jobId.replace(/[^a-zA-Z0-9_-]/g, '');
    return path.join(this.tempDir, `clip_${safeJobId}_${clipNumber}.${ext}`);
  }

  /**
   * Safely resolves a clip file from disk, protecting against path traversal.
   */
  public resolveSafeClipPath(filename: string): string | null {
    // Strip any directory traversal characters
    const sanitized = path.basename(filename);
    if (!sanitized || sanitized !== filename) {
      return null;
    }

    // Only allow expected filename formats (clip_... or source_...)
    const isSafePattern = /^(clip|source)_[a-zA-Z0-9_-]+(\.[a-zA-Z0-9]+)?$/.test(sanitized);
    if (!isSafePattern) {
      return null;
    }

    const fullPath = path.join(this.tempDir, sanitized);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }

    return null;
  }

  /**
   * Removes a specific temporary file immediately if it exists.
   * Useful for cleaning up source files right after clipping is complete.
   */
  public deleteFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.debug(`Deleted temp file: ${filePath}`, 'StorageService');
      }
    } catch (err) {
      logger.warn(`Could not delete temp file ${filePath}`, 'StorageService', err);
    }
  }

  /**
   * Periodically purges files older than TEMP_FILE_TTL_MINUTES.
   * Ensures compliance with the rule to never permanently store media.
   */
  public cleanExpiredFiles(): number {
    this.ensureTempDir();
    const ttlMs = config.tempFileTtlMinutes * 60 * 1000;
    const now = Date.now();
    let deletedCount = 0;

    try {
      const files = fs.readdirSync(this.tempDir);
      for (const file of files) {
        const fullPath = path.join(this.tempDir, file);
        try {
          const stats = fs.statSync(fullPath);
          if (stats.isFile()) {
            const ageMs = now - stats.mtimeMs;
            if (ageMs > ttlMs) {
              fs.unlinkSync(fullPath);
              deletedCount++;
              logger.debug(`Purged expired temp file: ${file} (age: ${Math.round(ageMs / 1000)}s)`, 'StorageService');
            }
          }
        } catch {
          // File might have been removed concurrently
        }
      }
    } catch (err) {
      logger.error('Error during scheduled temp files cleanup', 'StorageService', err);
    }

    if (deletedCount > 0) {
      logger.info(`Cleaned up ${deletedCount} expired temporary files`, 'StorageService');
    }
    return deletedCount;
  }

  private startCleanupScheduler(): void {
    // Run cleanup check every 5 minutes
    const intervalMs = 5 * 60 * 1000;
    this.cleanupTimer = setInterval(() => {
      this.cleanExpiredFiles();
    }, intervalMs);

    // Initial check on startup
    setTimeout(() => this.cleanExpiredFiles(), 1000);
  }

  public stopCleanupScheduler(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

export const storageService = new StorageService();
