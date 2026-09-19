import React, { useState } from 'react';
import { ArrowLeft, Film, Play, Sparkles, AlertCircle } from 'lucide-react';
import { UserQuota } from '../types';
import { extractYouTubeId, getVideoThumbnail, formatSecondsToTime } from '../utils/youtube';
import { VideoTimeline } from './VideoTimeline';

interface CustomClipProps {
  youtubeUrl: string;
  quota: UserQuota;
  onCreateClip: (startSeconds: number, endSeconds: number) => void;
  onBack: () => void;
  onOpenUpgrade: (limitReason?: 'auto' | 'custom' | null) => void;
}

export const CustomClip: React.FC<CustomClipProps> = ({
  youtubeUrl,
  quota,
  onCreateClip,
  onBack,
  onOpenUpgrade,
}) => {
  // Default selection: 00:00 to 01:00 (strictly max 1 minute)
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(60);
  const totalDuration = 600; // Simulated 10-minute YouTube video stream

  const isFree = quota.plan === 'free';
  const customRemaining = quota.customClipsDailyLimit !== null
    ? Math.max(0, quota.customClipsDailyLimit - quota.customClipsUsedToday)
    : null;
  const isQuotaExceeded = customRemaining !== null && customRemaining <= 0;

  const thumbnailUrl = getVideoThumbnail(youtubeUrl);
  const videoId = extractYouTubeId(youtubeUrl);
  const durationSeconds = endTime - startTime;

  const handleTimelineChange = (newStart: number, newEnd: number) => {
    setStartTime(newStart);
    setEndTime(newEnd);
  };

  const handleCreate = () => {
    if (isQuotaExceeded) {
      onOpenUpgrade('custom');
      return;
    }
    onCreateClip(startTime, endTime);
  };

  return (
    <div id="custom-clip-view" className="w-full max-w-3xl mx-auto px-4 py-6 sm:py-8">
      {/* Back button */}
      <button
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Options</span>
      </button>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold">
            Custom Clip Mode
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Select Custom Video Segment
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Choose the exact portion of the YouTube video you want to extract as an MP4 clip.
        </p>
      </div>

      {/* Video Preview Placeholder (16:9 Aspect Ratio) */}
      <div className="mb-6 bg-[#0b0f19] border border-[#1e293b] rounded-2xl overflow-hidden">
        <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
          <img
            src={thumbnailUrl}
            alt="Video Preview"
            className="w-full h-full object-cover opacity-80"
            referrerPolicy="no-referrer"
          />

          {/* Dark gradient & simulated player UI */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

          {/* Center simulated play icon */}
          <div className="absolute w-14 h-14 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white backdrop-blur-sm shadow-xl">
            <Play className="w-6 h-6 fill-current ml-0.5 text-cyan-400" />
          </div>

          {/* Selected timestamp banner overlay on preview */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs font-mono bg-black/80 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10">
            <div className="flex items-center gap-2 text-slate-300">
              <span>Segment:</span>
              <span className="text-cyan-400 font-bold">
                {formatSecondsToTime(startTime)} – {formatSecondsToTime(endTime)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Duration:</span>
              <span className="text-white font-bold bg-cyan-950 px-2 py-0.5 rounded border border-cyan-500/40">
                {formatSecondsToTime(durationSeconds)}
              </span>
            </div>
          </div>
        </div>

        {/* Video meta footer */}
        <div className="p-3 bg-[#0e1422] border-t border-[#1e293b] flex items-center justify-between text-xs text-slate-400">
          <div className="truncate flex items-center gap-2">
            <Film className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate text-slate-300">{youtubeUrl}</span>
          </div>
          <span className="text-[11px] font-mono text-slate-500 shrink-0">
            ID: {videoId || 'active-video'}
          </span>
        </div>
      </div>

      {/* Interactive Video Timeline */}
      <div className="mb-6">
        <VideoTimeline
          totalDurationSeconds={totalDuration}
          startTime={startTime}
          endTime={endTime}
          onChange={handleTimelineChange}
        />
      </div>

      {/* Quota reminder for Free users */}
      {isFree && customRemaining !== null && (
        <div className="mb-6 p-4 rounded-xl bg-[#0b0f19] border border-[#1e293b] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Free Plan Custom Clips remaining:</span>
            <span
              className={`font-mono font-bold ${
                isQuotaExceeded ? 'text-red-400' : 'text-cyan-400'
              }`}
            >
              {customRemaining} of {quota.customClipsDailyLimit} left today
            </span>
          </div>
          {isQuotaExceeded && (
            <button
              onClick={() => onOpenUpgrade('custom')}
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Upgrade
            </button>
          )}
        </div>
      )}

      {/* Action Button: "Create Clip" */}
      <button
        id="create-custom-clip-btn"
        onClick={handleCreate}
        className="w-full py-4 px-6 rounded-xl font-semibold text-sm bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-black shadow-lg shadow-cyan-950/60 transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        {isQuotaExceeded ? (
          <>
            <Sparkles className="w-4 h-4" />
            <span>Custom Limit Reached — Upgrade to Premium</span>
          </>
        ) : (
          <>
            <Film className="w-4 h-4" />
            <span>Create Clip ({formatSecondsToTime(durationSeconds)})</span>
          </>
        )}
      </button>

      {isQuotaExceeded && (
        <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-red-400">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>You have reached your daily limit of 2 custom clips on the Free plan.</span>
        </div>
      )}
    </div>
  );
};
