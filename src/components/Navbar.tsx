import React, { useState, useRef, useEffect } from 'react';
import { Film, LogOut, Sparkles, ChevronDown, Clock, ShieldCheck } from 'lucide-react';
import { UserData, UserQuota } from '../types';
import { UsageBadge } from './UsageBadge';

interface NavbarProps {
  user: UserData | null;
  quota: UserQuota;
  onNavigateHome: () => void;
  onNavigateLogin?: () => void;
  onOpenUpgrade: (limitReason?: 'auto' | 'custom' | null) => void;
  onSignOut: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  quota,
  onNavigateHome,
  onNavigateLogin,
  onOpenUpgrade,
  onSignOut,
}) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isFree = quota.plan === 'free';
  const isLoggedIn = !!user;

  // Extract initials for fallback avatar
  const initials = user?.displayName
    ? user.displayName.slice(0, 2).toUpperCase()
    : user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'CL';

  const formattedExpiry = user?.subscriptionExpiry
    ? new Date(user.subscriptionExpiry).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#1e293b]/70 bg-[#07090e]/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Logo / Brand */}
        <div
          onClick={onNavigateHome}
          className="flex items-center gap-2.5 cursor-pointer select-none group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-sky-400 flex items-center justify-center text-black font-bold shadow-md shadow-cyan-950/40">
            <Film className="w-5 h-5 text-black stroke-[2.2]" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold tracking-tight text-white group-hover:text-cyan-300 transition-colors">
              Clipto
            </span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 hidden sm:inline-block">
              clips
            </span>
          </div>
        </div>

        {/* Right controls */}
        {isLoggedIn && user ? (
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Plan Badge / Upgrade Button */}
            <button
              onClick={() => onOpenUpgrade(null)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                isFree
                  ? 'bg-slate-900 border-slate-700 text-slate-300 hover:border-cyan-500/50 hover:text-cyan-400'
                  : 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300 shadow-sm shadow-cyan-950'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isFree ? 'bg-slate-400' : 'bg-cyan-400 animate-pulse'
                }`}
              />
              <span className="capitalize font-mono">{quota.plan}</span>
              {isFree ? (
                <Sparkles className="w-3 h-3 text-cyan-400 ml-0.5" />
              ) : (
                <ShieldCheck className="w-3 h-3 text-cyan-400 ml-0.5" />
              )}
            </button>

            {/* Daily clips remaining badge */}
            <UsageBadge quota={quota} variant="compact" onUpgradeClick={() => onOpenUpgrade(null)} />

            {/* Account / Profile Button & Dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                id="account-profile-btn"
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-xl bg-[#0e1422] border border-[#1e293b] hover:border-slate-600 text-slate-200 transition-colors cursor-pointer"
                aria-label="Account profile"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Profile'}
                    className="w-7 h-7 rounded-lg object-cover border border-cyan-500/30"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-900 to-slate-800 border border-slate-700 flex items-center justify-center text-[11px] font-bold text-cyan-300">
                    {initials}
                  </div>
                )}
                <span className="text-xs font-medium max-w-[110px] truncate hidden md:inline-block text-slate-200">
                  {user.displayName || user.email.split('@')[0]}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Profile Dropdown */}
              {profileOpen && (
                <div
                  id="account-dropdown-menu"
                  className="absolute right-0 mt-2 w-72 rounded-xl bg-[#0b0f19] border border-[#1e293b] shadow-2xl p-3.5 z-50 text-slate-200 text-xs animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="pb-3 mb-3 border-b border-slate-800 flex items-center gap-3">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName}
                        className="w-10 h-10 rounded-xl object-cover border border-cyan-500/40 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-cyan-300 text-sm shrink-0">
                        {initials}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-white truncate text-sm">
                        {user.displayName || 'Clipto User'}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {user.email}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider bg-slate-800 text-cyan-400 border border-slate-700">
                          {quota.plan} tier
                        </span>
                        {user.plan === 'premium' && formattedExpiry && (
                          <span className="text-[10px] text-slate-400 font-mono flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5 text-cyan-400" />
                            exp {formattedExpiry}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Plan / Subscription Actions */}
                  <div className="py-2 mb-2 border-b border-slate-800 space-y-2">
                    {isFree ? (
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          onOpenUpgrade(null);
                        }}
                        className="w-full py-2 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Upgrade to Premium</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          onOpenUpgrade(null);
                        }}
                        className="w-full py-1.5 px-3 rounded-lg bg-[#0e1422] border border-cyan-500/30 text-cyan-300 text-xs flex items-center justify-center gap-1.5 hover:border-cyan-400 transition-colors cursor-pointer"
                      >
                        <span>Manage Subscription Plans</span>
                      </button>
                    )}
                  </div>

                  {/* Sign out */}
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      onSignOut();
                    }}
                    className="w-full py-2 px-2.5 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden sm:inline">SaaS Video Clipper</span>
            <button
              id="navbar-sign-in-btn"
              onClick={() => {
                if (onNavigateLogin) {
                  onNavigateLogin();
                } else {
                  onNavigateHome();
                }
              }}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black transition-colors cursor-pointer"
            >
              Sign In
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
