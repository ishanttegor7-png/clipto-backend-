import { config } from '../config/env.js';

export interface AutoClipInput {
  sourceUrl: string;
  batchStartSeconds: number;
  batchSize: number;
}

export interface CustomClipInput {
  sourceUrl: string;
  startSeconds: number;
  endSeconds: number;
}

/**
 * Validates whether the given string is a valid YouTube URL format.
 * Supports standard watch URLs, short URLs, embed URLs, and shorts.
 */
export function isValidYouTubeUrl(url: unknown): boolean {
  if (typeof url !== 'string' || !url.trim()) {
    return false;
  }

  const trimmed = url.trim();
  const pattern = /^(https?:\/\/)?((www|m)\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/)|youtu\.be\/)[\w-]{11}([?&#].*)?$/i;
  return pattern.test(trimmed);
}

/**
 * Extracts the 11-character YouTube video ID from a URL.
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  return match ? match[1] : null;
}

/**
 * Validates request body for POST /api/process/auto
 */
export function validateAutoClipRequest(body: any): { valid: boolean; error?: string; data?: AutoClipInput } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a valid JSON object' };
  }

  const { sourceUrl, batchStartSeconds, batchSize } = body;

  if (!sourceUrl || typeof sourceUrl !== 'string' || !sourceUrl.trim()) {
    return { valid: false, error: 'sourceUrl is required and must be a non-empty string' };
  }

  if (!isValidYouTubeUrl(sourceUrl)) {
    return { valid: false, error: 'sourceUrl must be a valid YouTube video URL' };
  }

  const parsedStart = batchStartSeconds !== undefined ? Number(batchStartSeconds) : 0;
  if (isNaN(parsedStart) || parsedStart < 0) {
    return { valid: false, error: 'batchStartSeconds must be a non-negative number' };
  }

  const parsedSize = batchSize !== undefined ? Number(batchSize) : 5;
  if (isNaN(parsedSize) || parsedSize < 1 || parsedSize > 5 || !Number.isInteger(parsedSize)) {
    return { valid: false, error: 'batchSize must be an integer between 1 and 5 (maximum 5 clips per batch)' };
  }

  return {
    valid: true,
    data: {
      sourceUrl: sourceUrl.trim(),
      batchStartSeconds: Math.floor(parsedStart),
      batchSize: parsedSize,
    },
  };
}

/**
 * Validates request body for POST /api/process/custom
 */
export function validateCustomClipRequest(body: any): { valid: boolean; error?: string; data?: CustomClipInput } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a valid JSON object' };
  }

  const { sourceUrl, startSeconds, endSeconds } = body;

  if (!sourceUrl || typeof sourceUrl !== 'string' || !sourceUrl.trim()) {
    return { valid: false, error: 'sourceUrl is required and must be a non-empty string' };
  }

  if (!isValidYouTubeUrl(sourceUrl)) {
    return { valid: false, error: 'sourceUrl must be a valid YouTube video URL' };
  }

  if (startSeconds === undefined || endSeconds === undefined) {
    return { valid: false, error: 'startSeconds and endSeconds are both required' };
  }

  const start = Number(startSeconds);
  const end = Number(endSeconds);

  if (isNaN(start) || start < 0) {
    return { valid: false, error: 'startSeconds must be a non-negative number' };
  }

  if (isNaN(end) || end <= start) {
    return { valid: false, error: 'endSeconds must be a number strictly greater than startSeconds' };
  }

  const duration = end - start;
  if (duration > config.maxClipLengthSeconds) {
    return {
      valid: false,
      error: `Clip duration (${duration.toFixed(1)}s) exceeds maximum allowed limit of ${config.maxClipLengthSeconds} seconds`,
    };
  }

  return {
    valid: true,
    data: {
      sourceUrl: sourceUrl.trim(),
      startSeconds: Math.floor(start),
      endSeconds: Math.ceil(end),
    },
  };
}
