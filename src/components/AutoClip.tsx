import React from 'react';
import { ArrowLeft, Sparkles, AlertCircle, Film, Layers } from 'lucide-react';
import { UserQuota } from '../types';
import { extractYouTubeId, getVideoThumbnail } from '../utils/youtube';

interface AutoClipProps {
  youtubeUrl: string;
  quota: UserQuota;
  onCreateClips: () => void;
  onBack: () => void;
  onOpenUpgrade: (limitReason?: 'auto' | 'custom' | null) => void;
  hasCreatedFirstBatch?: boolean;
}

export const AutoClip: React.FC<AutoClipProps> = ({
  youtubeUrl,
  quota,
  onCreateClips,
  onBack,
  onOpenUpgrade,
  hasCreatedFirstBatch = false,
}) => {
  const isFree = quota.plan === 'free';
  const autoRemaining = Math.max(0, quota.autoClipsDailyLimit - quota.autoClipsUsedToday);
  const isQuotaExceeded = autoRemaining <= 0;

  const thumbnailUrl = getVideoThumbnail(youtubeUrl);
  const videoId = extractYouTubeId(youtubeUrl);

  const exampleSegments = [
    { start: '0:00', end: '1:00', num: 1 },
    { start: '1:00', end: '2:00', num: 2 },
    { start: '2:00', end: '3:00', num: 3 },
    { start: '3:00', end: '4:00', num: 4 },
    { start: '4:00', end: '5:00', num: 5 },
  ];

  const handleAction = () => {
    if (isQuotaExceeded) {
      onOpenUpgrade('auto');
      return;
    }
    onCreateClips();
  };

  return (
    <div id="auto-clip-view" className="w-full max-w-3xl mx-auto px-4 py-6 sm:py-8">
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
            Auto Clip Mode
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Sequential 1-Minute Splits
        </h1>
      </div>

      {/* Video URL Display Card */}
      <div className="bg-[#0b0f19] border border-[#1e293b] rounded-2xl p-4 sm:p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="w-full sm:w-36 aspect-video bg-black rounded-xl overflow-hidden shrink-0 border border-slate-800">
          <img
            src={thumbnailUrl}
            alt="YouTube thumbnail preview"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-mono text-cyan-400 uppercase">Selected Source</span>
          <p className="text-sm font-semibold text-white truncate mt-0.5">
            {youtubeUrl}
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Film className="w-3.5 h-3.5 text-slate-500" />
              ID: {videoId || 'valid-stream'}
            </span>
            <span>•</span>
            <span className="text-slate-300">Aspect Ratio: 16:9</span>
          </div>
        </div>
      </div>

      {/* Requirements specifications block */}
      <div className="bg-[#0b0f19] border border-[#1e293b] rounded-2xl p-5 sm:p-6 mb-6 space-y-5">
        {/* Maximum video length notice */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#0e1422] border border-[#1e293b]">
          <div className="flex items-center gap-2.5">
            <Film className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold text-white">
              Maximum video length: 30 minutes
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
            Auto-capped
          </span>
        </div>

        {/* Sequential explanation */}
        <div>
          <p className="text-sm text-slate-300 font-medium mb-1">
            Clips are created in sequential 1-minute segments.
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            One batch creates 5 clips sequentially from the start of the video.
          </p>
        </div>

        {/* Sequential Example list (0:00–1:00, 1:00–2:00, etc.) */}
        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Example Batch Sequence (5 Clips):</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            {exampleSegments.map((seg) => (
              <div
                key={seg.num}
                className="bg-[#0e1422] border border-[#1e293b] rounded-xl p-2.5 text-center"
              >
                <span className="text-[10px] font-mono text-slate-500 block mb-0.5">
                  Clip {seg.num}
                </span>
                <span className="text-xs font-mono font-bold text-cyan-300">
                  {seg.start}–{seg.end}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quota info for Free users */}
        {isFree && (
          <div className="pt-4 border-t border-[#1e293b] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Remaining daily Auto Clip quota:</span>
              <span
                id="auto-clip-quota-display"
                className={`font-mono font-bold ${
                  isQuotaExceeded ? 'text-red-400' : 'text-cyan-400'
                }`}
              >
                {autoRemaining} of {quota.autoClipsDailyLimit} clips today
              </span>
            </div>

            {isQuotaExceeded ? (
              <button
                onClick={() => onOpenUpgrade('auto')}
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Upgrade for 30/day
              </button>
            ) : (
              <span className="text-slate-500 text-[11px]">Resets daily at 00:00 UTC</span>
            )}
          </div>
        )}

        {/* Premium plan quota display */}
        {!isFree && (
          <div className="pt-4 border-t border-[#1e293b] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Premium Daily Auto Clips:</span>
              <span className="font-mono font-bold text-cyan-400">
                {autoRemaining} of {quota.autoClipsDailyLimit} left
              </span>
            </div>
            <span className="text-[11px] text-cyan-400 bg-cyan-950/50 border border-cyan-500/30 px-2 py-0.5 rounded font-mono">
              Premium Tier
            </span>
          </div>
        )}
      </div>

      {/* Action Button: "Create Clips" or "Create More" */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          id="create-clips-btn"
          onClick={handleAction}
          className="w-full py-4 px-6 rounded-xl font-semibold text-sm bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-black shadow-lg shadow-cyan-950/60 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {isQuotaExceeded ? (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Quota Reached — Upgrade to Create Clips</span>
            </>
          ) : hasCreatedFirstBatch ? (
            <>
              <Layers className="w-4 h-4" />
              <span>Create More</span>
            </>
          ) : (
            <>
              <Film className="w-4 h-4" />
              <span>Create Clips</span>
            </>
          )}
        </button>
      </div>

      {isQuotaExceeded && (
        <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-red-400">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>You have used all 5 of your daily Auto Clips on the Free Plan.</span>
        </div>
      )}
    </div>
  );
};
