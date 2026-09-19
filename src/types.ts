export type PlanType = 'free' | 'premium';

export type SubscriptionStatus = 'none' | 'active' | 'expired';

export interface UserData {
  userId: string;
  email: string;
  displayName: string;
  photoURL: string;
  plan: PlanType;
  subscriptionExpiry: string | null;
  subscriptionStatus: SubscriptionStatus;
  autoClipsUsedToday: number;
  customClipsUsedToday: number;
  usageResetDate: string; // "YYYY-MM-DD"
  createdAt: string;
}

export interface UserQuota {
  plan: PlanType;
  autoClipsUsedToday: number;
  autoClipsDailyLimit: number; // 5 for free, 30 for premium
  customClipsUsedToday: number;
  customClipsDailyLimit: number | null; // 2 for free, null (not configured/not invented) for premium
  subscriptionStatus?: SubscriptionStatus;
  subscriptionExpiry?: string | null;
}

export interface SubscriptionVerificationResult {
  userId: string;
  plan: PlanType;
  subscriptionStatus: SubscriptionStatus;
  subscriptionExpiry: string | null;
  isPremium: boolean;
  dailyLimits: {
    autoClips: number;
    customClips: number | null;
  };
}

export interface ClipItem {
  id: string;
  clipNumber: number;
  startTime: string; // e.g. "0:00"
  endTime: string;   // e.g. "1:00"
  duration: string;  // e.g. "01:00"
  format: string;    // "MP4"
  aspectRatio: string; // "16:9"
  resolution: string; // "1080p"
  videoTitle: string;
  thumbnailUrl?: string;
  downloadUrl?: string;
  previewUrl?: string;
  fileSizeMb?: number;
}

export type ViewState = 
  | 'landing' 
  | 'login' 
  | 'dashboard' 
  | 'auto-clip' 
  | 'custom-clip' 
  | 'processing' 
  | 'results';

export type ErrorType = 
  | 'invalid_url' 
  | 'empty_url' 
  | 'processing_error' 
  | 'video_unavailable' 
  | 'video_too_long'
  | 'network_failure'
  | 'auth_failure'
  | 'limit_reached' 
  | null;

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface JobStatusResponse {
  jobId: string;
  status: JobStatus;
  clips?: ClipItem[];
  downloadUrl?: string;
  startTime?: string;
  endTime?: string;
  error?: string;
}
