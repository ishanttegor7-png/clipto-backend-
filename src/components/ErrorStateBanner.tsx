import React from 'react';
import { AlertCircle, AlertTriangle, Lock, VideoOff, ArrowRight, Clock, WifiOff, ShieldAlert } from 'lucide-react';
import { ErrorType } from '../types';

interface ErrorStateBannerProps {
  error: ErrorType;
  onDismiss?: () => void;
  onUpgradeClick?: () => void;
}

export const ErrorStateBanner: React.FC<ErrorStateBannerProps> = ({
  error,
  onDismiss,
  onUpgradeClick,
}) => {
  if (!error) return null;

  const errorConfigs: Record<
    NonNullable<ErrorType>,
    {
      title: string;
      description: string;
      icon: React.ReactNode;
      border: string;
      action?: React.ReactNode;
    }
  > = {
    empty_url: {
      title: 'YouTube URL Required',
      description: 'Please enter a YouTube video URL before proceeding.',
      icon: <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />,
      border: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
    },
    invalid_url: {
      title: 'Invalid YouTube URL',
      description: 'The link provided does not look like a valid YouTube video. Please use a URL like youtube.com/watch?v=... or youtu.be/...',
      icon: <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />,
      border: 'border-red-500/30 bg-red-500/10 text-red-200',
    },
    processing_error: {
      title: 'Processing Failure',
      description: 'Video clipping operation could not be completed. Direct cloud datacenter stream downloads are restricted or conversion failed.',
      icon: <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />,
      border: 'border-red-500/30 bg-red-500/10 text-red-200',
    },
    video_unavailable: {
      title: 'Video Unavailable',
      description: 'This YouTube video is private, age-restricted, or removed by its creator.',
      icon: <VideoOff className="w-5 h-5 text-amber-400 shrink-0" />,
      border: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
    },
    video_too_long: {
      title: 'Video Longer Than 30 Minutes',
      description: 'The selected video exceeds the 30-minute maximum limit supported by Clipto. Please select a video 30 minutes or shorter.',
      icon: <Clock className="w-5 h-5 text-rose-400 shrink-0" />,
      border: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
    },
    network_failure: {
      title: 'Network Failure',
      description: 'Unable to communicate with the processing server. Please check your internet connection and try again.',
      icon: <WifiOff className="w-5 h-5 text-orange-400 shrink-0" />,
      border: 'border-orange-500/30 bg-orange-500/10 text-orange-200',
    },
    limit_reached: {
      title: 'Daily Limit Reached',
      description: 'You have reached your daily clipping limit. Free plan: 5 Auto and 2 Custom clips per day.',
      icon: <Lock className="w-5 h-5 text-cyan-400 shrink-0" />,
      border: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200',
      action: onUpgradeClick ? (
        <button
          onClick={onUpgradeClick}
          className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-cyan-500 text-black hover:bg-cyan-400 transition-colors cursor-pointer"
        >
          <span>Upgrade to Premium</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      ) : null,
    },
    auth_failure: {
      title: 'Authentication Failure',
      description: 'Unable to authenticate user session. Please sign in again to access the clipping dashboard.',
      icon: <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />,
      border: 'border-red-500/30 bg-red-500/10 text-red-200',
    },
  };

  const current = errorConfigs[error];
  if (!current) return null;

  return (
    <div
      id={`error-state-${error}`}
      className={`w-full rounded-xl border p-4 flex items-start gap-3 transition-all ${current.border}`}
    >
      <div className="mt-0.5">{current.icon}</div>
      <div className="flex-1 text-xs">
        <h4 className="font-semibold text-sm mb-0.5 text-white">{current.title}</h4>
        <p className="opacity-90 leading-relaxed">{current.description}</p>
        {'action' in current && current.action}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-white p-1 rounded transition-colors text-xs"
          aria-label="Dismiss error"
        >
          ✕
        </button>
      )}
    </div>
  );
};
