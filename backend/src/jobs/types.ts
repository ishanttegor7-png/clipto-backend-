export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export type JobType = 'auto' | 'custom';

export interface ClipResult {
  clipNumber: number;
  startTime: number;
  endTime: number;
  downloadUrl: string;
  duration?: number;
  filename?: string;
  fileSizeMb?: number;
}

export interface Job {
  jobId: string;
  type: JobType;
  status: JobStatus;
  sourceUrl: string;
  batchStartSeconds?: number;
  batchSize?: number;
  startSeconds?: number;
  endSeconds?: number;
  clips: ClipResult[];
  error: string | null;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

export interface JobStatusResponse {
  jobId: string;
  status: JobStatus;
  clips: ClipResult[];
  error: string | null;
}
