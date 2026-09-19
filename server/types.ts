export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface BackendClip {
  id: string;
  clipNumber: number;
  startTime: string; // e.g. "0:00"
  endTime: string;   // e.g. "1:00"
  duration: string;  // e.g. "01:00"
  format: string;    // "MP4"
  aspectRatio: string;
  resolution: string;
  videoTitle: string;
  thumbnailUrl?: string;
  downloadUrl: string;
  previewUrl?: string;
  fileSizeMb?: number;
}

export interface JobRecord {
  jobId: string;
  type: 'auto' | 'custom';
  status: JobStatus;
  youtubeUrl: string;
  batchIndex?: number;
  startTime?: string;
  endTime?: string;
  downloadUrl?: string;
  clips?: BackendClip[];
  error?: string;
  createdAt: number;
  expiresAt: number;
}

export interface AutoClipRequestBody {
  youtubeUrl: string;
  batchIndex?: number;
  videoDurationSeconds?: number;
  userQuotaRemaining?: number;
  demoSource?: boolean;
}

export interface CustomClipRequestBody {
  youtubeUrl: string;
  startTimeSeconds: number;
  endTimeSeconds: number;
  userQuotaRemaining?: number;
  demoSource?: boolean;
}
