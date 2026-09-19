import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import { ViewState, PlanType, UserData, UserQuota, ClipItem, ErrorType } from './types';
import {
  getOrCreateUserRecord,
  incrementClipUsage,
  verifySubscriptionWithServer,
  setTestSubscriptionState,
} from './services/userService';
import { logoutUser, AuthResult } from './services/authService';
import {
  startAutoClipProcessing,
  startCustomClipProcessing,
} from './services/videoProcessingService';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { LoginPage } from './components/LoginPage';
import { Dashboard } from './components/Dashboard';
import { AutoClip } from './components/AutoClip';
import { CustomClip } from './components/CustomClip';
import { ProcessingScreen } from './components/ProcessingScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { PremiumModal } from './components/PremiumModal';

export default function App() {
  // Navigation & View state
  const [currentView, setCurrentView] = useState<ViewState>('landing');

  // Real Firebase User record state
  const [user, setUser] = useState<UserData | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Daily quota state
  const [quota, setQuota] = useState<UserQuota>({
    plan: 'free',
    autoClipsUsedToday: 0,
    autoClipsDailyLimit: 5,
    customClipsUsedToday: 0,
    customClipsDailyLimit: 2,
    subscriptionStatus: 'none',
  });

  // Active YouTube video URL
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');

  // Active clip generation mode
  const [clipMode, setClipMode] = useState<'auto' | 'custom'>('auto');

  // Custom clip timing selection (seconds)
  const [customRange, setCustomRange] = useState<{ start: number; end: number }>({
    start: 0,
    end: 60,
  });

  // Batch creation tracking for sequential Auto Clips
  const [hasCreatedFirstBatch, setHasCreatedFirstBatch] = useState(false);
  const [batchCount, setBatchCount] = useState(0);

  // Active processing job tracking
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);

  // Test worker mode toggle: enables ffmpeg MP4 rendering for QA verification
  const [testWorkerMode, setTestWorkerMode] = useState<boolean>(false);

  // Generated clips result
  const [generatedClips, setGeneratedClips] = useState<ClipItem[]>([]);

  // Modals & Errors
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [limitReachedReason, setLimitReachedReason] = useState<'auto' | 'custom' | null>(null);
  const [currentError, setCurrentError] = useState<ErrorType>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const openUpgradeModal = (reason: 'auto' | 'custom' | null = null) => {
    setLimitReachedReason(reason);
    setIsPremiumModalOpen(true);
  };

  // Helper to sync quota from UserData
  const syncQuotaFromUserData = (userData: UserData) => {
    const isFree = userData.plan === 'free';
    setQuota({
      plan: userData.plan,
      autoClipsUsedToday: userData.autoClipsUsedToday,
      autoClipsDailyLimit: isFree ? 5 : 30,
      customClipsUsedToday: userData.customClipsUsedToday,
      customClipsDailyLimit: isFree ? 2 : null, // Do NOT invent custom clip limit for premium
      subscriptionStatus: userData.subscriptionStatus,
      subscriptionExpiry: userData.subscriptionExpiry,
    });
  };

  // Listen to Firebase Auth state changes & authoritatively verify subscription
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const record = await getOrCreateUserRecord(firebaseUser);
          setUser(record);
          syncQuotaFromUserData(record);

          // Server-side Authoritative Subscription Verification
          const serverVerified = await verifySubscriptionWithServer(firebaseUser.uid, record);
          if (serverVerified) {
            const verifiedUserData: UserData = {
              ...record,
              plan: serverVerified.plan,
              subscriptionStatus: serverVerified.subscriptionStatus,
              subscriptionExpiry: serverVerified.subscriptionExpiry,
            };
            setUser(verifiedUserData);
            syncQuotaFromUserData(verifiedUserData);

            if (record.plan === 'premium' && serverVerified.plan === 'free') {
              showToast('Subscription expired. Account automatically reverted to Free tier.');
            }
          }

          setCurrentView((prev) => (prev === 'login' || prev === 'landing' ? 'dashboard' : prev));
        } catch (err) {
          console.error('Failed to load user record from Firestore:', err);
        }
      } else {
        setUser(null);
        setQuota({
          plan: 'free',
          autoClipsUsedToday: 0,
          autoClipsDailyLimit: 5,
          customClipsUsedToday: 0,
          customClipsDailyLimit: 2,
          subscriptionStatus: 'none',
        });
        setCurrentView((prev) => (prev !== 'landing' && prev !== 'login' ? 'landing' : prev));
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Auth actions
  const handleLoginSuccess = async (authResult: AuthResult) => {
    setUser(authResult.userData);
    syncQuotaFromUserData(authResult.userData);

    // Verify on server
    const serverVerified = await verifySubscriptionWithServer(authResult.userData.userId, authResult.userData);
    if (serverVerified) {
      const verifiedData: UserData = {
        ...authResult.userData,
        plan: serverVerified.plan,
        subscriptionStatus: serverVerified.subscriptionStatus,
        subscriptionExpiry: serverVerified.subscriptionExpiry,
      };
      setUser(verifiedData);
      syncQuotaFromUserData(verifiedData);
    }

    setCurrentView('dashboard');
    showToast(
      `Welcome, ${authResult.userData.displayName || authResult.userData.email.split('@')[0]}!`
    );
  };

  const handleSignOut = async () => {
    try {
      await logoutUser();
      setUser(null);
      setCurrentView('landing');
      showToast('Signed out of Clipto');
    } catch (err) {
      console.error('Failed to sign out:', err);
    }
  };

  // Phase 4 Developer Tester: Simulates subscription states on the backend
  const handleTestSubscriptionState = async (
    state: 'active_weekly' | 'active_monthly' | 'expired' | 'free'
  ) => {
    if (!user) return;
    const ok = await setTestSubscriptionState(user.userId, state);
    if (ok) {
      const serverVerified = await verifySubscriptionWithServer(user.userId, user);
      if (serverVerified) {
        const updatedUser: UserData = {
          ...user,
          plan: serverVerified.plan,
          subscriptionStatus: serverVerified.subscriptionStatus,
          subscriptionExpiry: serverVerified.subscriptionExpiry,
        };
        setUser(updatedUser);
        syncQuotaFromUserData(updatedUser);

        if (state === 'expired') {
          showToast('Expired timestamp passed: Account automatically reverted to Free tier');
        } else if (state === 'active_weekly') {
          showToast('Simulated Active Weekly Premium (7 days) in database');
        } else if (state === 'active_monthly') {
          showToast('Simulated Active Monthly Premium (30 days) in database');
        } else {
          showToast('Reset to Default Free plan in database');
        }
      }
    }
  };

  // Landing Page -> Login transition
  const handleLandingLoginToStart = (enteredUrl: string) => {
    if (enteredUrl) {
      setYoutubeUrl(enteredUrl);
    }
    if (user) {
      setCurrentView('dashboard');
    } else {
      setCurrentView('login');
    }
  };

  // Dashboard selections
  const handleSelectAutoClip = () => {
    setCurrentError(null);
    setCurrentView('auto-clip');
  };

  const handleSelectCustomClip = () => {
    setCurrentError(null);
    setCurrentView('custom-clip');
  };

  // Generate Clips: Auto Mode
  // Connects to POST /api/process/auto
  const handleCreateAutoClips = async () => {
    const autoRemaining = quota.autoClipsDailyLimit - quota.autoClipsUsedToday;
    if (autoRemaining <= 0) {
      setCurrentError('limit_reached');
      openUpgradeModal('auto'); // Requirement: Automatically show modal when limit reached
      return;
    }

    setClipMode('auto');
    setProcessingError(null);

    try {
      // 1. Send processing request to backend endpoint
      const response = await startAutoClipProcessing({
        youtubeUrl,
        batchIndex: batchCount,
        videoDurationSeconds: 720, // 12-minute default for demonstration of sequential batches
        userQuotaRemaining: autoRemaining,
        demoSource: testWorkerMode,
      });

      setActiveJobId(response.jobId);
      setCurrentView('processing');
    } catch (err: any) {
      setProcessingError(err.message || 'Failed to start video processing job.');
      setCurrentView('processing');
    }
  };

  // Generate Clips: Custom Mode
  // Connects to POST /api/process/custom
  const handleCreateCustomClip = async (startSeconds: number, endSeconds: number) => {
    const duration = endSeconds - startSeconds;
    if (duration > 60) {
      showToast('Custom clip duration cannot exceed 1 minute.');
      return;
    }

    if (quota.customClipsDailyLimit !== null) {
      const customRemaining = quota.customClipsDailyLimit - quota.customClipsUsedToday;
      if (customRemaining <= 0) {
        setCurrentError('limit_reached');
        openUpgradeModal('custom'); // Requirement: Automatically show modal when limit reached
        return;
      }
    }

    setCustomRange({ start: startSeconds, end: endSeconds });
    setClipMode('custom');
    setProcessingError(null);

    try {
      const customRemaining =
        quota.customClipsDailyLimit !== null
          ? quota.customClipsDailyLimit - quota.customClipsUsedToday
          : 999;

      const response = await startCustomClipProcessing({
        youtubeUrl,
        startTimeSeconds: startSeconds,
        endTimeSeconds: endSeconds,
        userQuotaRemaining: customRemaining,
        demoSource: testWorkerMode,
      });

      setActiveJobId(response.jobId);
      setCurrentView('processing');
    } catch (err: any) {
      setProcessingError(err.message || 'Failed to start custom clip processing.');
      setCurrentView('processing');
    }
  };

  // Successful Backend Job Completion Handler
  const handleProcessingSuccess = async (clips: ClipItem[]) => {
    setGeneratedClips(clips);

    if (clipMode === 'auto') {
      setHasCreatedFirstBatch(true);
      setBatchCount((prev) => prev + 1);

      // Deduct only the actual number of generated clips from daily quota
      const newUsed = Math.min(
        quota.autoClipsDailyLimit,
        quota.autoClipsUsedToday + clips.length
      );
      setQuota((prev) => ({ ...prev, autoClipsUsedToday: newUsed }));

      if (user) {
        try {
          const updated = await incrementClipUsage(user.userId, 'auto', clips.length);
          if (updated) setUser(updated);
        } catch (err) {
          console.error('Failed to increment auto usage in Firestore:', err);
        }
      }
    } else {
      // Custom clip
      setQuota((prev) => ({
        ...prev,
        customClipsUsedToday: prev.customClipsUsedToday + 1,
      }));

      if (user) {
        try {
          const updated = await incrementClipUsage(user.userId, 'custom', 1);
          if (updated) setUser(updated);
        } catch (err) {
          console.error('Failed to increment custom usage in Firestore:', err);
        }
      }
    }

    setCurrentView('results');
  };

  // Processing Error Handler
  const handleProcessingError = (errorMessage: string) => {
    setProcessingError(errorMessage);
  };

  // Download Action for Individual Clip
  const handleDownloadClip = (clip: ClipItem) => {
    showToast(`Downloading Clip ${clip.clipNumber} (${clip.format} • ${clip.duration})...`);
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-mono text-slate-400">Loading Clipto session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Global Navbar */}
      <Navbar
        user={user}
        quota={quota}
        onNavigateHome={() => {
          if (user) {
            setCurrentView('dashboard');
          } else {
            setCurrentView('landing');
          }
        }}
        onNavigateLogin={() => setCurrentView('login')}
        onOpenUpgrade={() => openUpgradeModal(null)}
        onSignOut={handleSignOut}
      />

      {/* Main View Area with strict logged-out access protection */}
      <main className="flex-1 w-full">
        {/* If user is not logged in and current view is protected, show Landing page */}
        {(!user || currentView === 'landing') && currentView !== 'login' && (
          <LandingPage
            onLoginToStart={handleLandingLoginToStart}
            initialUrl={youtubeUrl}
          />
        )}

        {currentView === 'login' && (
          <LoginPage
            onLoginSuccess={handleLoginSuccess}
            onBackToLanding={() => setCurrentView('landing')}
            pendingUrl={youtubeUrl}
          />
        )}

        {user && currentView === 'dashboard' && (
          <Dashboard
            user={user}
            youtubeUrl={youtubeUrl}
            setYoutubeUrl={setYoutubeUrl}
            quota={quota}
            onSelectAutoClip={handleSelectAutoClip}
            onSelectCustomClip={handleSelectCustomClip}
            onOpenUpgrade={(reason) => openUpgradeModal(reason)}
            error={currentError}
            setError={setCurrentError}
            onTestSubscriptionState={handleTestSubscriptionState}
          />
        )}

        {user && currentView === 'auto-clip' && (
          <AutoClip
            youtubeUrl={youtubeUrl}
            quota={quota}
            onCreateClips={handleCreateAutoClips}
            onBack={() => setCurrentView('dashboard')}
            onOpenUpgrade={(reason) => openUpgradeModal(reason || 'auto')}
            hasCreatedFirstBatch={hasCreatedFirstBatch}
          />
        )}

        {user && currentView === 'custom-clip' && (
          <CustomClip
            youtubeUrl={youtubeUrl}
            quota={quota}
            onCreateClip={handleCreateCustomClip}
            onBack={() => setCurrentView('dashboard')}
            onOpenUpgrade={(reason) => openUpgradeModal(reason || 'custom')}
          />
        )}

        {user && currentView === 'processing' && (
          <ProcessingScreen
            jobId={activeJobId}
            clipMode={clipMode}
            onSuccess={handleProcessingSuccess}
            onError={handleProcessingError}
            errorMessage={processingError}
            onBack={() => setCurrentView('dashboard')}
            onRetry={() => {
              if (clipMode === 'auto') {
                handleCreateAutoClips();
              } else {
                handleCreateCustomClip(customRange.start, customRange.end);
              }
            }}
          />
        )}

        {user && currentView === 'results' && (
          <ResultsScreen
            clips={generatedClips}
            videoUrl={youtubeUrl}
            onClipAnother={() => {
              setCurrentView('dashboard');
            }}
            onCreateMore={() => {
              if (clipMode === 'auto') {
                const autoRemaining = quota.autoClipsDailyLimit - quota.autoClipsUsedToday;
                if (autoRemaining <= 0) {
                  openUpgradeModal('auto');
                  return;
                }
                handleCreateAutoClips();
              } else {
                setCurrentView('custom-clip');
              }
            }}
            canCreateMore={
              clipMode === 'auto'
                ? quota.autoClipsDailyLimit - quota.autoClipsUsedToday > 0
                : true
            }
            onDownloadClip={handleDownloadClip}
            clipMode={clipMode}
          />
        )}
      </main>

      {/* Premium Upgrade Modal (Phase 4) */}
      <PremiumModal
        isOpen={isPremiumModalOpen}
        onClose={() => {
          setIsPremiumModalOpen(false);
          setLimitReachedReason(null);
        }}
        currentPlan={quota.plan}
        limitReachedReason={limitReachedReason}
        user={user}
      />

      {/* Architecture QA / Test Mode Switcher in Developer Bar */}
      <div className="w-full max-w-4xl mx-auto px-4 py-2">
        <div className="p-3 bg-[#080b12] border border-[#1e293b] rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-slate-300 font-mono text-[11px]">
              Backend Architecture Mode:
            </span>
            <span className={`font-semibold px-2 py-0.5 rounded text-[10px] uppercase font-mono ${
              testWorkerMode ? 'bg-cyan-950 text-cyan-400 border border-cyan-500/30' : 'bg-slate-800 text-slate-300 border border-slate-700'
            }`}>
              {testWorkerMode ? 'FFmpeg Worker Mode (Generates Real MP4s)' : 'Direct Cloud Download (Enforces YouTube Restrictions)'}
            </span>
          </div>

          <button
            onClick={() => {
              setTestWorkerMode(!testWorkerMode);
              showToast(
                !testWorkerMode
                  ? 'Switched to FFmpeg Worker Mode (Real MP4 generation active)'
                  : 'Switched to Direct Cloud Download Mode (Enforces YouTube restrictions)'
              );
            }}
            className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 underline underline-offset-4 cursor-pointer"
          >
            {testWorkerMode ? 'Switch to Direct Cloud Mode' : 'Enable FFmpeg Worker Mode for Real MP4 Download'}
          </button>
        </div>
      </div>

      {/* Subtle Bottom Toast Feedback */}
      {toastMessage && (
        <div
          id="global-toast"
          className="fixed bottom-5 right-5 z-50 bg-[#0e1422] border border-cyan-500/40 text-slate-100 text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          <div className="w-2 h-2 rounded-full bg-cyan-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Clean Minimalist Footer */}
      <footer className="w-full border-t border-[#1e293b]/50 py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© Clipto • Sequential & Custom YouTube Video Clipper</span>
          <span className="text-[11px] font-mono text-slate-600">
            Phase 5: Production Readiness & Testing • Sequential & Custom YouTube Clipper
          </span>
        </div>
      </footer>
    </div>
  );
}
