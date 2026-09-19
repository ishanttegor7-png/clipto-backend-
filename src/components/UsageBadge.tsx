import React from 'react';
import { Sparkles } from 'lucide-react';
import { UserQuota } from '../types';

interface UsageBadgeProps {
  quota: UserQuota;
  variant?: 'compact' | 'detailed';
  onUpgradeClick?: () => void;
}

export const UsageBadge: React.FC<UsageBadgeProps> = ({
  quota,
  variant = 'compact',
  onUpgradeClick,
}) => {
  const isFree = quota.plan === 'free';
  const autoRemaining = Math.max(0, quota.autoClipsDailyLimit - quota.autoClipsUsedToday);
  const customRemaining = quota.customClipsDailyLimit !== null
    ? Math.max(0, quota.customClipsDailyLimit - quota.customClipsUsedToday)
    : null;

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-[#0e1422] border border-[#1e293b] rounded-lg px-2.5 py-1 text-xs">
          <span className="text-slate-400 mr-1.5 hidden sm:inline">Daily Clips:</span>
          <span className="font-mono text-cyan-400 font-medium">
            {autoRemaining} Auto
          </span>
          <span className="text-slate-600 mx-1">•</span>
          <span className="font-mono text-slate-300 font-medium">
            {customRemaining !== null ? `${customRemaining} Custom` : 'Custom ∞'}
          </span>
        </div>

        {isFree && onUpgradeClick && (
          <button
            onClick={onUpgradeClick}
            className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 transition-colors"
          >
            <Sparkles className="w-3 h-3" />
            <span>Upgrade</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#0b0f19] border border-[#1e293b] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className={`text-[11px] font-bold tracking-wider px-2 py-0.5 rounded uppercase ${
              isFree
                ? 'bg-slate-800 text-slate-300 border border-slate-700'
                : 'bg-cyan-950/80 text-cyan-400 border border-cyan-500/30'
            }`}
          >
            {isFree ? 'Free Plan' : 'Premium Plan'}
          </span>
          <span className="text-xs text-slate-400">Daily Limits</span>
        </div>
        {isFree && onUpgradeClick && (
          <button
            onClick={onUpgradeClick}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Unlock More
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-[#0e1422] p-2.5 rounded-lg border border-[#1e293b]/70">
          <span className="text-slate-400 block mb-1">Auto Clips</span>
          <div className="flex items-baseline gap-1">
            <span className="text-base font-semibold text-white font-mono">
              {autoRemaining}
            </span>
            <span className="text-slate-500 font-mono">
              / {quota.autoClipsDailyLimit} left
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-cyan-400 h-full rounded-full transition-all duration-300"
              style={{
                width: `${(autoRemaining / quota.autoClipsDailyLimit) * 100}%`,
              }}
            />
          </div>
        </div>

        <div className="bg-[#0e1422] p-2.5 rounded-lg border border-[#1e293b]/70">
          <span className="text-slate-400 block mb-1">Custom Clips</span>
          <div className="flex items-baseline gap-1">
            {customRemaining !== null ? (
              <>
                <span className="text-base font-semibold text-white font-mono">
                  {customRemaining}
                </span>
                <span className="text-slate-500 font-mono">
                  / {quota.customClipsDailyLimit} left
                </span>
              </>
            ) : (
              <span className="text-xs text-slate-400 italic">
                Configured later
              </span>
            )}
          </div>
          {customRemaining !== null && quota.customClipsDailyLimit ? (
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-sky-400 h-full rounded-full transition-all duration-300"
                style={{
                  width: `${(customRemaining / quota.customClipsDailyLimit) * 100}%`,
                }}
              />
            </div>
          ) : (
            <div className="w-full bg-slate-800/40 h-1.5 rounded-full mt-2" />
          )}
        </div>
      </div>
    </div>
  );
};
