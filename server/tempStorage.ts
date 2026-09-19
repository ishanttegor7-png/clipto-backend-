import fs from 'fs';
import path from 'path';

export const TEMP_DIR = '/tmp/clipto_processing';
export const TEMP_TTL_MS = 15 * 60 * 1000; // 15 minutes temporary TTL

// Ensure temporary directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

interface StoredFileMetadata {
  filename: string;
  createdAt: number;
}

const fileRegistry = new Map<string, StoredFileMetadata>();

export function registerTempFile(filename: string): void {
  fileRegistry.set(filename, {
    filename,
    createdAt: Date.now(),
  });
}

export function getTempFilePath(filename: string): string | null {
  const filePath = path.join(TEMP_DIR, filename);
  if (fs.existsSync(filePath)) {
    return filePath;
  }
  return null;
}

export function deleteTempFile(filename: string): void {
  try {
    const filePath = path.join(TEMP_DIR, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error(`Failed to delete temp file ${filename}:`, err);
  } finally {
    fileRegistry.delete(filename);
  }
}

/**
 * Sweeps temporary folder and removes files older than TTL
 */
export function cleanupExpiredTempFiles(): void {
  const now = Date.now();

  try {
    const files = fs.readdirSync(TEMP_DIR);
    for (const file of files) {
      const filePath = path.join(TEMP_DIR, file);
      try {
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > TEMP_TTL_MS) {
          fs.unlinkSync(filePath);
          fileRegistry.delete(file);
        }
      } catch {
        // file may have been unlinked concurrently
      }
    }
  } catch (err) {
    console.error('Error during temporary file cleanup:', err);
  }
}

// Periodic cleanup sweep every 2 minutes
setInterval(cleanupExpiredTempFiles, 2 * 60 * 1000);
