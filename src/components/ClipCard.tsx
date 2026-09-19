import React, { useState } from 'react';
import { Download, Play, Pause, Check, Film, FileVideo } from 'lucide-react';
import { ClipItem } from '../types';

interface ClipCardProps {
  clip: ClipItem;
  onDownload?: (clip: ClipItem) => void;
}

export const ClipCard: React.FC<ClipCardProps> = ({ clip, onDownload }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = () => {
    setIsDownloading(true);
    if (onDownload) {
      onDownload(clip);
    }

    if (clip.downloadUrl) {
      const link = document.createElement('a');
      link.href = clip.downloadUrl;
      link.setAttribute('download', `clipto_clip_${clip.clipNumber}.mp4`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    setTimeout(() => {
      setIsDownloading(false);
      setIsDownloaded(true);
      setTimeout(() => setIsDownloaded(false), 3000);
    }, 800);
  };

  return (
    <div
      id={`clip-card-${clip.id}`}
      className="bg-[#0b0f19] border border-[#1e293b] rounded-2xl overflow-hidden hover:border-slate-700 transition-all flex flex-col group"
    >
      {/* Aspect Ratio 16:9 Video Player / Preview */}
      <div className="relative aspect-video w-full bg-[#05070c] overflow-hidden flex items-center justify-center select-none">
        {isPlaying && clip.previewUrl ? (
          <video
            src={clip.previewUrl}
            autoPlay
            controls
            playsInline
            className="w-full h-full object-cover"
          />
        ) : clip.thumbnailUrl ? (
          <img
            src={clip.thumbnailUrl}
            alt={clip.videoTitle}
            className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#0b0f19] via-[#090d16] to-[#04060a] flex items-center justify-center">
            <Film className="w-10 h-10 text-slate-700" />
          </div>
        )}

        {/* Dark overlay when not playing */}
        {!isPlaying && (
          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
        )}

        {/* Play/Pause Simulator Overlay */}
        {!isPlaying && (
          <button
            onClick={() => setIsPlaying(true)}
            className="absolute z-10 w-12 h-12 rounded-full bg-black/70 hover:bg-cyan-500 hover:text-black text-white border border-white/20 hover:border-transparent flex items-center justify-center transition-all backdrop-blur-sm shadow-xl cursor-pointer"
            aria-label="Play preview"
          >
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </button>
        )}

        {/* Playing state ripple/pulse animation */}
        {isPlaying && (
          <button
            onClick={() => setIsPlaying(false)}
            className="absolute top-3 left-3 bg-cyan-500/90 text-black text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1.5 shadow cursor-pointer z-20"
          >
            <Pause className="w-3 h-3 fill-current" />
            <span>PAUSE PREVIEW</span>
          </button>
        )}

        {/* Aspect Ratio & Format Tag */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10 pointer-events-none">
          <span className="bg-black/80 backdrop-blur-md text-[10px] font-mono font-medium px-2 py-0.5 rounded border border-white/10 text-slate-300">
            {clip.aspectRatio}
          </span>
          <span className="bg-cyan-950/90 text-cyan-400 backdrop-blur-md text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-cyan-500/30">
            {clip.format}
          </span>
        </div>

        {/* Timestamp Range Overlay on Video */}
        {!isPlaying && (
          <div className="absolute bottom-3 left-3 bg-black/85 backdrop-blur-md text-slate-200 text-xs font-mono font-medium px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1.5">
            <span className="text-cyan-400">{clip.startTime}</span>
            <span className="text-slate-500">→</span>
            <span className="text-cyan-400">{clip.endTime}</span>
            <span className="text-slate-500">({clip.duration})</span>
          </div>
        )}
      </div>

      {/* Clip details & Individual Download Button */}
      <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between gap-4">
        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-xs font-bold text-cyan-400 font-mono tracking-wider uppercase">
              Clip {clip.clipNumber}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {clip.resolution} • {clip.duration}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-slate-200 line-clamp-2 leading-snug">
            {clip.videoTitle}
          </h3>
        </div>

        {/* Individual Download Button */}
        <div className="pt-2 border-t border-[#1e293b]/70 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <FileVideo className="w-3.5 h-3.5 text-cyan-400" />
            <span>MP4 Video</span>
          </div>

          <button
            id={`download-clip-${clip.id}-btn`}
            onClick={handleDownload}
            disabled={isDownloading}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              isDownloaded
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                : isDownloading
                ? 'bg-slate-800 text-slate-400 cursor-wait'
                : 'bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-black shadow-md shadow-cyan-950/50'
            }`}
          >
            {isDownloading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                <span>Downloading...</span>
              </>
            ) : isDownloaded ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Downloaded</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download MP4</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
