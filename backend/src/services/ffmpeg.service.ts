import { spawn } from 'child_process';
import fs from 'fs';
import { logger } from '../utils/logger.js';

export interface VideoMetadata {
  duration: number;
  width?: number;
  height?: number;
  format?: string;
}

export interface CutClipOptions {
  inputPath: string;
  outputPath: string;
  startTime: number;
  duration: number;
}

class FFmpegService {
  /**
   * Checks if FFmpeg binary is available on the system.
   */
  public async isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn('ffmpeg', ['-version']);
      proc.on('error', () => resolve(false));
      proc.on('close', (code) => resolve(code === 0));
    });
  }

  /**
   * Uses ffprobe to retrieve duration and dimensions of a media file.
   */
  public async probeVideo(filePath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      const args = [
        '-v', 'error',
        '-show_entries', 'format=duration:stream=width,height,codec_type',
        '-of', 'json',
        filePath,
      ];

      const proc = spawn('ffprobe', args);
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(`ffprobe failed with exit code ${code}: ${stderr}`));
        }

        try {
          const parsed = JSON.parse(stdout);
          const duration = parsed.format?.duration ? parseFloat(parsed.format.duration) : 0;
          const videoStream = parsed.streams?.find((s: any) => s.codec_type === 'video');

          resolve({
            duration,
            width: videoStream?.width,
            height: videoStream?.height,
            format: parsed.format?.format_name,
          });
        } catch (err) {
          reject(new Error(`Failed to parse ffprobe output: ${err}`));
        }
      });

      proc.on('error', (err) => {
        reject(new Error(`ffprobe process error: ${err.message}`));
      });
    });
  }

  /**
   * Cuts an MP4 segment from the input file using FFmpeg.
   * Preserves native aspect ratio and resolution.
   * First attempts fast stream copy (-c copy); falls back to fast H.264/AAC re-encoding if needed.
   */
  public async cutClip(options: CutClipOptions): Promise<void> {
    const { inputPath, outputPath, startTime, duration } = options;

    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file not found at: ${inputPath}`);
    }

    // Try fast copy first to avoid unnecessary re-encoding
    try {
      await this.executeCut(inputPath, outputPath, startTime, duration, false);
      logger.debug(`Successfully generated clip via fast stream copy: ${outputPath}`, 'FFmpegService');
      return;
    } catch (copyErr) {
      logger.debug(`Stream copy unavailable or failed, falling back to H.264 re-encode: ${copyErr}`, 'FFmpegService');
    }

    // Fallback: fast re-encode preserving aspect ratio
    await this.executeCut(inputPath, outputPath, startTime, duration, true);
    logger.debug(`Successfully generated clip via fast H.264 encode: ${outputPath}`, 'FFmpegService');
  }

  private executeCut(
    inputPath: string,
    outputPath: string,
    startTime: number,
    duration: number,
    reencode: boolean
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const args: string[] = ['-y'];

      // Fast seek before input
      args.push('-ss', startTime.toString());
      args.push('-t', duration.toString());
      args.push('-i', inputPath);

      if (!reencode) {
        // Stream copy: zero quality loss, fastest speed, preserves original resolution/aspect ratio
        args.push('-c', 'copy');
        args.push('-movflags', '+faststart');
      } else {
        // High quality fast encode: preserves original aspect ratio, standard H.264/AAC MP4
        args.push('-c:v', 'libx264');
        args.push('-preset', 'veryfast');
        args.push('-crf', '22');
        args.push('-c:a', 'aac');
        args.push('-b:a', '128k');
        args.push('-movflags', '+faststart');
      }

      args.push(outputPath);

      const proc = spawn('ffmpeg', args);
      let stderr = '';

      proc.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      proc.on('close', (code) => {
        if (code === 0 && fs.existsSync(outputPath)) {
          resolve();
        } else {
          reject(new Error(`FFmpeg exited with code ${code}. Error: ${stderr.slice(-300)}`));
        }
      });

      proc.on('error', (err) => {
        reject(new Error(`Failed to spawn FFmpeg: ${err.message}`));
      });
    });
  }
}

export const ffmpegService = new FFmpegService();
