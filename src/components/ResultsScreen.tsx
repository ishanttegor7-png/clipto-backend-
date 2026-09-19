import React from 'react';
import { ArrowLeft, CheckCircle2, RefreshCw } from 'lucide-react';
import { ClipItem } from '../types';
import { ClipCard } from './ClipCard';

interface ResultsScreenProps {
  clips: ClipItem[];
  videoUrl: string;
  onClipAnother: () => void;
  onCreateMore: () => void;
  canCreateMore: boolean;
  onDownloadClip?: (clip: ClipItem) => void;
  clipMode: 'auto' | 'custom';
}

export const ResultsScreen: React.FC<ResultsScreenProps> = ({
  clips,
  videoUrl,
  onClipAnother,
  onCreateMore,
  canCreateMore,
  onDownloadClip,
  clipMode,
}) => {
  return (
    <div id="results-screen" className="w-full max-w-5xl mx-auto px-4 py-6 sm:py-8">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-[#1e293b]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Generated Clips ({clips.length})
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Output format: <span className="text-cyan-400 font-mono font-medium">MP4</span> • Preserved aspect ratio 16:9 • Ready for download
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="clip-another-btn"
            onClick={onClipAnother}
            className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold bg-[#0e1422] border border-[#1e293b] hover:border-slate-600 text-slate-300 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>New Video</span>
          </button>

          {clipMode === 'auto' && (
            <button
              id="create-more-clips-btn"
              onClick={onCreateMore}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                canCreateMore
                  ? 'bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-black shadow-md shadow-cyan-950'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Create More</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid of Generated Clips */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {clips.map((clip) => (
          <ClipCard key={clip.id} clip={clip} onDownload={onDownloadClip} />
        ))}
      </div>

      {/* Footer reassurance note */}
      <div className="mt-8 text-center text-xs text-slate-500">
        Every clip includes an individual MP4 download button. Files are rendered with the original video's 16:9 widescreen ratio.
      </div>
    </div>
  );
};
