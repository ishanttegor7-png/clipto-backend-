import { ClipItem, JobStatusResponse } from '../types';

export interface StartAutoClipParams {
  youtubeUrl: string;
  batchIndex: number;
  videoDurationSeconds?: number;
  userQuotaRemaining: number;
  demoSource?: boolean;
}

export interface StartCustomClipParams {
  youtubeUrl: string;
  startTimeSeconds: number;
  endTimeSeconds: number;
  userQuotaRemaining: number;
  demoSource?: boolean;
}

export interface StartJobResponse {
  jobId: string;
  status: string;
  message: string;
}

/**
 * Initiates sequential auto clip processing with the backend
 */
export async function startAutoClipProcessing(
  params: StartAutoClipParams
): Promise<StartJobResponse> {
  const res = await fetch('/api/process/auto', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to start auto clip processing');
  }

  return data;
}

/**
 * Initiates custom clip processing with the backend
 */
export async function startCustomClipProcessing(
  params: StartCustomClipParams
): Promise<StartJobResponse> {
  const res = await fetch('/api/process/custom', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to start custom clip processing');
  }

  return data;
}

/**
 * Queries the current processing status of a job
 */
export async function getProcessingJobStatus(
  jobId: string
): Promise<JobStatusResponse> {
  const res = await fetch(`/api/process/status/${encodeURIComponent(jobId)}`);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Failed to check processing status');
  }

  return data;
}

/**
 * Polls the backend until the job status is completed or failed.
 * Polling checks every intervalMs (default 1000ms).
 */
export async function pollProcessingJob(
  jobId: string,
  intervalMs = 1000,
  maxWaitMs = 60000
): Promise<JobStatusResponse> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const jobStatus = await getProcessingJobStatus(jobId);

    if (jobStatus.status === 'completed' || jobStatus.status === 'failed') {
      return jobStatus;
    }

    // Wait for the next polling tick
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error('Processing timed out. Please try again.');
}

/**
 * Retrieves video metadata from the backend
 */
export async function fetchVideoMetadata(youtubeUrl: string) {
  const res = await fetch(`/api/video/metadata?url=${encodeURIComponent(youtubeUrl)}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to retrieve video metadata');
  }
  return data;
}
