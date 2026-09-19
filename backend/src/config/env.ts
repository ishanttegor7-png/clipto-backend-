import dotenv from 'dotenv';
import path from 'path';
import os from 'os';

dotenv.config();

export interface AppConfig {
  port: number;
  frontendUrl: string;
  tempFileTtlMinutes: number;
  maxVideoLengthSeconds: number;
  maxClipLengthSeconds: number;
  tempDir: string;
  nodeEnv: string;
}

const parsedPort = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const parsedTtl = process.env.TEMP_FILE_TTL_MINUTES
  ? parseInt(process.env.TEMP_FILE_TTL_MINUTES, 10)
  : 15;
const parsedMaxVideoLength = process.env.MAX_VIDEO_LENGTH_SECONDS
  ? parseInt(process.env.MAX_VIDEO_LENGTH_SECONDS, 10)
  : 1800; // 30 minutes
const parsedMaxClipLength = process.env.MAX_CLIP_LENGTH_SECONDS
  ? parseInt(process.env.MAX_CLIP_LENGTH_SECONDS, 10)
  : 60; // 60 seconds

export const config: AppConfig = {
  port: isNaN(parsedPort) ? 3000 : parsedPort,
  frontendUrl: process.env.FRONTEND_URL || '*',
  tempFileTtlMinutes: isNaN(parsedTtl) ? 15 : parsedTtl,
  maxVideoLengthSeconds: isNaN(parsedMaxVideoLength) ? 1800 : parsedMaxVideoLength,
  maxClipLengthSeconds: isNaN(parsedMaxClipLength) ? 60 : parsedMaxClipLength,
  tempDir: process.env.TEMP_DIR || path.join(os.tmpdir(), 'clipto_backend'),
  nodeEnv: process.env.NODE_ENV || 'development',
};
