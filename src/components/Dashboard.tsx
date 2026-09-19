import React, { useState } from 'react';
import { Layers, Scissors, Film, ArrowRight, Sparkles, Check, Clock, AlertCircle, Clipboard, X } from 'lucide-react';
import { ErrorType, UserData, UserQuota } from '../types';
import { isValidYouTubeUrl, extractYouTubeId, getVideoThumbnail } from '../utils/youtube';
import { ErrorStateBanner } from './ErrorStateBanner';

interface DashboardProps {
  user: UserData | null;
  youtubeUrl: string;
  setYoutubeUrl: (url: string) => void;
  quota: UserQuota;
  onSelectAutoClip: () => void;
  onSelectCustomClip: () => void;
  onOpenUpgrade: (limitReason?: 'auto' | 'custom' | null) => void;
  error: ErrorType;
  setError: (err: ErrorType) => void;
  onTestSubscriptionState?: (state: 'active_weekly' | 'active_monthly' | 'expired' | 'free') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  user,
  youtubeUrl,
  setYoutubeUrl,
  quota,
  onSelectAutoClip,
  onSelectCustomClip,
  onOpenUpgrade,
  error,
  setError,
  onTestSubscriptionState,
}) => {
  const isFree = quota.plan === 'free';
  const [showTesterControls, setShowTesterControls] = useState(false);

  const autoRemaining = Math.max(0, quota.autoClipsDailyLimit - quota.autoClipsUsedToday);
  const customRemaining = quota.customClipsDailyLimit !== null
    ? Math.max(0, quota.customClipsDailyLimit - quota.customClipsUsedToday)
    : null;

  const initials = user?.displayName
    ? user.displayName.slice(0, 2).toUpperCase()
    : user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'CL';

  // Format expiry date for presentation
  const formattedExpiry = user?.subscriptionExpiry
    ? new Date(user.subscriptionExpiry).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setYoutubeUrl(e.target.value);
    if (error) setError(null);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setYoutubeUrl(text);
        if (error) setError(null);
      }
    } catch {
      // Ignore clipboard read error in sandboxed environment
    }
  };

  const handleClear = () => {
    setYoutubeUrl('');
    if (error) setError(null);
  };

  const validateUrl = (): boolean => {
    if (!youtubeUrl.trim()) {
      setError('empty_url');
      return false;
    }
    if (!isValidYouTubeUrl(youtubeUrl)) {
      setError('invalid_url');
      return false;
    }
    setError(null);
    return true;
  };

  // Phase 4 Requirement: Automatically show Premium upgrade modal when limits reached
  const handleAutoClipClick = () => {
    if (!validateUrl()) return;
    const autoRemaining = quota.autoClipsDailyLimit - quota.autoClipsUsedToday;
    if (autoRemaining <= 0) {
      setError('limit_reached');
      onOpenUpgrade('auto'); // Opens modal explaining Auto limit reached
      return;
    }
    onSelectAutoClip();
  };

  const handleCustomClipClick = () => {
    if (!validateUrl()) return;
    if (quota.customClipsDailyLimit !== null) {
      const customRemaining = quota.customClipsDailyLimit - quota.customClipsUsedToday;
      if (customRemaining <= 0) {
        setError('limit_reached');
        onOpenUpgrade('custom'); // Opens modal explaining Custom limit reached
        return;
      }
    }
    onSelectCustomClip();
  };

  const validUrl = isValidYouTubeUrl(youtubeUrl);
  const thumbnailUrl = validUrl ? getVideoThumbnail(youtubeUrl) : null;

  return (
    <div id="dashboard-view" className="w-full max-w-4xl mx-auto px-4 py-6 sm:py-10">
      {/* Error state notification banner */}
      {error && (
        <div className="mb-6">
          <ErrorStateBanner
            error={error}
            onDismiss={() => setError(null)}
            onUpgradeClick={() => onOpenUpgrade(null)}
          />
        </div>
      )}

      {/* Requirement: Dashboard User Account, Free/Premium Badge, Usage & Expiry */}
      {user && (
        <section id="user-dashboard-profile-bar" className="mb-6 bg-[#0b0f19] border border-[#1e293b] rounded-2xl p-4 sm:p-5 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* User details & Free/Premium status badge */}
            <div className="flex items-center gap-3.5">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName}
                  className="w-12 h-12 rounded-xl object-cover border border-cyan-500/40 shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-950 to-slate-800 border border-slate-700 flex items-center justify-center font-bold text-cyan-300 text-base shrink-0">
                  {initials}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white tracking-tight">
                    {user.displayName || 'Clipto Creator'}
                  </h2>

                  {/* Free / Premium Badge */}
                  <span
                    id="user-plan-badge"
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono tracking-wider ${
                      user.plan === 'premium'
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-950'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {user.plan} tier
                  </span>

                  {user.subscriptionStatus === 'expired' && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase font-mono bg-amber-950/60 text-amber-400 border border-amber-500/30">
                      Expired
                    </span>
                  )}
                </div>

                {/* Email address */}
                <p className="text-xs text-slate-400 mt-0.5">
                  {user.email}
                </p>

                {/* Premium Expiry Date when applicable */}
                {user.plan === 'premium' && formattedExpiry && (
                  <div id="premium-expiry-display" className="flex items-center gap-1.5 text-xs text-cyan-400 mt-1 font-mono">
                    <Clock className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span>Premium active • Expires: {formattedExpiry}</span>
                  </div>
                )}

                {/* Expired notice when applicable */}
                {user.subscriptionStatus === 'expired' && formattedExpiry && (
                  <div id="premium-expired-display" className="flex items-center gap-1 text-[11px] text-slate-400 mt-1 font-mono">
                    <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>Expired on {formattedExpiry} • Account reverted to Free</span>
                  </div>
                )}
              </div>
            </div>

            {/* Remaining Daily Usage Display */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Auto clips quota */}
              <div className="flex-1 sm:flex-initial bg-[#0e1422] border border-[#1e293b] px-3.5 py-2 rounded-xl text-xs">
                <span className="text-[11px] text-slate-400 block mb-0.5">
                  Remaining Auto Clips:
                </span>
                <span className="font-mono font-bold text-cyan-400 text-sm">
                  {autoRemaining}
                  <span className="text-slate-500 text-xs font-normal"> / {quota.autoClipsDailyLimit} today</span>
                </span>
              </div>

              {/* Custom clips quota */}
              <div className="flex-1 sm:flex-initial bg-[#0e1422] border border-[#1e293b] px-3.5 py-2 rounded-xl text-xs">
                <span className="text-[11px] text-slate-400 block mb-0.5">
                  Remaining Custom Clips:
                </span>
                {customRemaining !== null ? (
                  <span className="font-mono font-bold text-sky-400 text-sm">
                    {customRemaining}
                    <span className="text-slate-500 text-xs font-normal"> / {quota.customClipsDailyLimit} today</span>
                  </span>
                ) : (
                  <span className="font-mono text-slate-400 text-xs italic">
                    Configured later
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Main Section: "YouTube Video" */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Film className="w-5 h-5 text-cyan-400" />
            <span>YouTube Video</span>
          </h1>

          {/* Quick sample loader */}
          <button
            onClick={() => {
              setYoutubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
              if (error) setError(null);
            }}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
          >
            Paste Sample URL
          </button>
        </div>

        {/* Input box */}
        <div className="bg-[#0b0f19] border border-[#1e293b] rounded-2xl p-2 sm:p-2.5 focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500 transition-all flex items-center gap-2 shadow-xl">
          <div className="relative flex-1 flex items-center">
            <Film className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
            <input
              id="dashboard-youtube-url-input"
              type="text"
              value={youtubeUrl}
              onChange={handleUrlChange}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full min-h-[44px] bg-transparent pl-10 pr-10 text-xs sm:text-sm text-white placeholder-slate-500 outline-none"
            />
            {youtubeUrl && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-2 p-1.5 text-slate-500 hover:text-white rounded-lg transition-colors"
                aria-label="Clear input"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handlePaste}
            className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#0e1422] border border-[#1e293b] text-slate-300 hover:text-white hover:border-slate-700 transition-colors hidden sm:flex items-center gap-1.5 shrink-0"
          >
            <Clipboard className="w-3.5 h-3.5" />
            <span>Paste</span>
          </button>
        </div>

        {/* URL detection preview pill */}
        {validUrl && thumbnailUrl && (
          <div className="mt-3 p-3 rounded-xl bg-[#0e1422] border border-[#1e293b] flex items-center gap-3 animate-in fade-in duration-200">
            <div className="w-16 aspect-video rounded-lg overflow-hidden bg-black shrink-0 border border-slate-800">
              <img
                src={thumbnailUrl}
                alt="Thumbnail preview"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-mono uppercase text-emerald-400 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Valid YouTube Video Link Detected
              </span>
              <p className="text-xs text-white font-medium truncate mt-0.5">
                {youtubeUrl}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Two Large Options: AUTO CLIP and CUSTOM CLIP */}
      <section className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* AUTO CLIP CARD */}
          <div
            id="auto-clip-card"
            className="bg-[#0b0f19] border border-[#1e293b] hover:border-cyan-500/50 rounded-2xl p-6 transition-all flex flex-col justify-between group shadow-xl"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                  <Layers className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded font-bold">
                  Option 1
                </span>
              </div>

              <h2 className="text-xl font-bold tracking-tight text-white mb-2">
                AUTO CLIP
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4">
                Automatically split the video into sequential 1-minute clips.
              </p>

              <div className="bg-[#0e1422] rounded-xl p-3 border border-[#1e293b]/70 mb-6 text-xs text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Clip format:</span>
                  <span className="text-cyan-400 font-mono">0:00-1:00, 1:00-2:00...</span>
                </div>
                <div className="flex justify-between">
                  <span>Batch size:</span>
                  <span className="text-slate-300 font-mono">5 clips per batch</span>
                </div>
              </div>
            </div>

            <button
              id="auto-clip-btn"
              onClick={handleAutoClipClick}
              className="w-full min-h-[48px] py-3 px-5 rounded-xl font-semibold text-xs sm:text-sm bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-black shadow-lg shadow-cyan-950/60 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Auto Clip</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* CUSTOM CLIP CARD */}
          <div
            id="custom-clip-card"
            className="bg-[#0b0f19] border border-[#1e293b] hover:border-sky-500/50 rounded-2xl p-6 transition-all flex flex-col justify-between group shadow-xl"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform">
                  <Scissors className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 bg-sky-950/60 border border-sky-500/30 px-2 py-0.5 rounded font-bold">
                  Option 2
                </span>
              </div>

              <h2 className="text-xl font-bold tracking-tight text-white mb-2">
                CUSTOM CLIP
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4">
                Choose exactly which part of the video you want to clip.
              </p>

              <div className="bg-[#0e1422] rounded-xl p-3 border border-[#1e293b]/70 mb-6 text-xs text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Maximum duration:</span>
                  <span className="text-sky-400 font-mono">1 minute max</span>
                </div>
                <div className="flex justify-between">
                  <span>Selection:</span>
                  <span className="text-slate-300 font-mono">Horizontal timeline</span>
                </div>
              </div>
            </div>

            <button
              id="custom-clip-btn"
              onClick={handleCustomClipClick}
              className="w-full min-h-[48px] py-3 px-5 rounded-xl font-semibold text-xs sm:text-sm bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-black shadow-lg shadow-sky-950/60 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Custom Clip</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Plan Limits UI (Strictly formatted as required) */}
      <section className="mb-10">
        <div className="bg-[#0b0f19] border border-[#1e293b] rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Plan Usage Quotas
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                  isFree
                    ? 'bg-slate-800 text-slate-300 border border-slate-700'
                    : 'bg-cyan-950 text-cyan-400 border border-cyan-500/30'
                }`}
              >
                {quota.plan} active
              </span>
            </div>
            {isFree && (
              <button
                onClick={() => onOpenUpgrade(null)}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Upgrade Limits
              </button>
            )}
          </div>

          {/* FREE PLAN UI & PREMIUM PLAN UI DISPLAY */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Free Plan Display */}
            <div
              className={`p-4 rounded-xl border ${
                isFree
                  ? 'bg-[#0e1422] border-cyan-500/30 ring-1 ring-cyan-500/20'
                  : 'bg-[#080b12] border-[#1e293b] opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  FREE PLAN UI
                </span>
                {isFree && (
                  <span className="text-[10px] text-cyan-400 font-mono">Current Plan</span>
                )}
              </div>
              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Auto clips:</span>
                  <span className="font-mono font-bold text-white">5/day</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Custom clips:</span>
                  <span className="font-mono font-bold text-white">2/day</span>
                </div>
              </div>
            </div>

            {/* Premium Plan Display */}
            <div
              className={`p-4 rounded-xl border ${
                !isFree
                  ? 'bg-[#0e1422] border-cyan-500/30 ring-1 ring-cyan-500/20'
                  : 'bg-[#080b12] border-[#1e293b]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  PREMIUM PLAN UI
                </span>
                {!isFree && (
                  <span className="text-[10px] text-cyan-400 font-mono">Current Plan</span>
                )}
              </div>
              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Auto clips:</span>
                  <span className="font-mono font-bold text-cyan-400">30/day</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Custom clips:</span>
                  <span className="font-mono text-slate-400 italic text-[11px]">
                    Configured later
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* State Preview / Testing Simulator Drawer */}
      <section className="pt-2 border-t border-[#1e293b]/70">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowTesterControls(!showTesterControls)}
            className="text-[11px] font-mono text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>Tester QA Tools ({showTesterControls ? 'Hide' : 'Show Error States & Subscription Expiry Simulator'})</span>
          </button>
        </div>

        {showTesterControls && (
          <div className="mt-3 p-3.5 bg-[#080b12] border border-[#1e293b] rounded-xl text-xs space-y-3 animate-in fade-in duration-150">
            <div>
              <p className="text-slate-400 font-medium text-[11px] mb-1.5">
                Error & Limit State Previews:
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setError('empty_url')}
                  className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 text-[11px]"
                >
                  1. Empty URL
                </button>
                <button
                  onClick={() => setError('invalid_url')}
                  className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 text-[11px]"
                >
                  2. Invalid YouTube URL
                </button>
                <button
                  onClick={() => setError('processing_error')}
                  className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 text-[11px]"
                >
                  3. Processing Error
                </button>
                <button
                  onClick={() => setError('video_unavailable')}
                  className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 text-[11px]"
                >
                  4. Video Unavailable
                </button>
                <button
                  onClick={() => setError('video_too_long')}
                  className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 text-[11px]"
                >
                  5. Video &gt; 30 mins
                </button>
                <button
                  onClick={() => setError('network_failure')}
                  className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 text-[11px]"
                >
                  6. Network Failure
                </button>
                <button
                  onClick={() => setError('auth_failure')}
                  className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 text-[11px]"
                >
                  7. Auth Failure
                </button>
                <button
                  onClick={() => {
                    setError('limit_reached');
                    onOpenUpgrade('auto');
                  }}
                  className="px-2.5 py-1 rounded bg-amber-950 text-amber-300 border border-amber-500/30 hover:bg-amber-900 text-[11px]"
                >
                  8. Auto Limit Reached Modal
                </button>
                <button
                  onClick={() => {
                    setError('limit_reached');
                    onOpenUpgrade('custom');
                  }}
                  className="px-2.5 py-1 rounded bg-amber-950 text-amber-300 border border-amber-500/30 hover:bg-amber-900 text-[11px]"
                >
                  9. Custom Limit Reached Modal
                </button>
                <button
                  onClick={() => setError(null)}
                  className="px-2.5 py-1 rounded bg-slate-900 text-slate-400 hover:text-white text-[11px]"
                >
                  Clear Errors
                </button>
              </div>
            </div>

            {onTestSubscriptionState && user && (
              <div className="pt-2 border-t border-slate-800/80">
                <p className="text-slate-400 font-medium text-[11px] mb-1.5">
                  Phase 4 Server-Side Subscription Expiry Simulation:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => onTestSubscriptionState('active_weekly')}
                    className="px-2.5 py-1 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-900 text-[11px]"
                  >
                    Simulate Active Weekly (7 Days)
                  </button>
                  <button
                    onClick={() => onTestSubscriptionState('active_monthly')}
                    className="px-2.5 py-1 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-900 text-[11px]"
                  >
                    Simulate Active Monthly (30 Days)
                  </button>
                  <button
                    onClick={() => onTestSubscriptionState('expired')}
                    className="px-2.5 py-1 rounded bg-rose-950 text-rose-300 border border-rose-500/30 hover:bg-rose-900 text-[11px]"
                  >
                    Simulate Expired Timestamp (Auto-revert to Free)
                  </button>
                  <button
                    onClick={() => onTestSubscriptionState('free')}
                    className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 text-[11px]"
                  >
                    Reset to Default Free
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
