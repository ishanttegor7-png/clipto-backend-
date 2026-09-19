import React, { useEffect, useState, useRef } from 'react';
import { Film, AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';
import { ClipItem } from '../types';
import { pollProcessingJob } from '../services/videoProcessingService';

interface ProcessingScreenProps {
  jobId: string | null;
  clipMode: 'auto' | 'custom';
  onSuccess: (clips: ClipItem[]) => void;
  onBack: () => void;
  onError: (errorMessage: string) => void;
  errorMessage?: string | null;
  onRetry?: () => void;
}

export const ProcessingScreen: React.FC<ProcessingScreenProps> = ({
  jobId,
  clipMode,
  onSuccess,
  onBack,
  onError,
  errorMessage,
  onRetry,
}) => {
  const [isPolling, setIsPolling] = useState(true);
  const [backendError, setBackendError] = useState<string | null>(errorMessage || null);
  const isPolledRef = useRef(false);

  useEffect(() => {
    if (!jobId || isPolledRef.current) return;
    isPolledRef.current = true;
    setIsPolling(true);
    setBackendError(null);

    const runPolling = async () => {
      try {
        const result = await pollProcessingJob(jobId, 1200, 60000);

        if (result.status === 'completed' && result.clips && result.clips.length > 0) {
          setIsPolling(false);
          onSuccess(result.clips);
        } else if (result.status === 'failed') {
          setIsPolling(false);
          const err = result.error || 'Video processing failed. Please verify the URL and try again.';
          setBackendError(err);
          onError(err);
        }
      } catch (err: any) {
        setIsPolling(false);
        const errStr = err.message || 'An error occurred while communicating with the video processor.';
        setBackendError(errStr);
        onError(errStr);
      }
    };

    runPolling();
  }, [jobId, onSuccess, onError]);

  // If backend reported failure, display clear error message per requirement 6
  if (backendError) {
    return (
      <div
        id="processing-error-screen"
        className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-12 text-center"
      >
        <div className="w-full max-w-md bg-[#0b0f19] border border-red-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 stroke-[2]" />
          </div>

          <h2 className="text-xl font-bold tracking-tight text-white mb-2">
            Processing Error
          </h2>

          <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/20 text-xs text-red-200 text-left mb-6 leading-relaxed">
            <p className="font-semibold text-red-300 mb-1">Backend Response:</p>
            <p>{backendError}</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={onBack}
              className="w-full sm:flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-[#0e1422] border border-[#1e293b] hover:bg-[#151d30] text-slate-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </button>
            {onRetry && (
              <button
                onClick={onRetry}
                className="w-full sm:flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-black transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Active Processing Screen
  // Requirement 2: Show only "Processing..."
  // Requirement 3: Do not show percentage or progress bar.
  return (
    <div
      id="processing-screen"
      className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-12 text-center select-none"
    >
      <div className="relative w-28 h-28 mb-8 flex items-center justify-center">
        {/* Subtle glowing ring */}
        <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20 animate-ping opacity-30" />

        {/* Sleek rotating ring without percentage */}
        <div className="absolute inset-0 rounded-full border-2 border-slate-800 border-t-cyan-400 border-r-cyan-400/40 animate-spin" />

        {/* Center icon */}
        <div className="w-16 h-16 rounded-full bg-[#0b0f19] border border-[#1e293b] flex items-center justify-center text-cyan-400 shadow-xl shadow-cyan-950/40">
          <Film className="w-7 h-7 stroke-[1.8] animate-pulse" />
        </div>
      </div>

      {/* Required Text: Exactly "Processing..." */}
      <h2
        id="processing-title"
        className="text-2xl font-bold tracking-tight text-white mb-2"
      >
        Processing...
      </h2>

      <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
        {clipMode === 'auto'
          ? 'Segmenting video into sequential 1-minute clips.'
          : 'Trimming selected clip from video source.'}
      </p>
    </div>
  );
};
