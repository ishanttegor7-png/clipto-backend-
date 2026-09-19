import { Router, Request, Response } from 'express';
import { storageService } from '../services/storage.service.js';
import { logger } from '../utils/logger.js';

export const downloadRouter = Router();

/**
 * GET /api/download/:filename
 *
 * Streams generated temporary MP4 clips for user download.
 * Validates path security against directory traversal.
 */
downloadRouter.get('/:filename', (req: Request, res: Response) => {
  const { filename } = req.params;

  if (!filename) {
    res.status(400).json({ error: 'Filename parameter is required' });
    return;
  }

  const resolvedPath = storageService.resolveSafeClipPath(filename);

  if (!resolvedPath) {
    logger.warn(`Download requested for missing or invalid file: ${filename}`, 'DownloadRouter');
    res.status(404).json({
      error: 'Clip file not found or expired. Clipto deletes temporary files periodically for privacy and storage efficiency.',
    });
    return;
  }

  // Set standard download headers for MP4 video
  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  res.sendFile(resolvedPath, (err) => {
    if (err) {
      logger.error(`Error streaming download file ${filename}`, 'DownloadRouter', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream video download' });
      }
    }
  });
});
