import React, { useState } from 'react';
import { Film, ArrowRight, Play, Scissors, Layers, Check, Sparkles, AlertCircle } from 'lucide-react';
import { isValidYouTubeUrl } from '../utils/youtube';

interface LandingPageProps {
  onLoginToStart: (url: string) => void;
  initialUrl?: string;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onLoginToStart,
  initialUrl = '',
}) => {
  const [url, setUrl] = useState(initialUrl);
  const [validationError, setValidationError] = useState<'empty' | 'invalid' | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();

    if (!trimmed) {
      setValidationError('empty');
      return;
    }

    if (!isValidYouTubeUrl(trimmed)) {
      setValidationError('invalid');
      return;
    }

    setValidationError(null);
    onLoginToStart(trimmed);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    if (validationError) setValidationError(null);
  };

  return (
    <div id="landing-page" className="w-full flex flex-col items-center justify-center">
      {/* Top Hero Section */}
      <section className="w-full max-w-4xl mx-auto px-4 pt-12 pb-16 sm:pt-20 sm:pb-24 text-center">
        {/* Subtle pill tag */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-medium mb-6">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>SaaS Video Clipper</span>
        </div>

        {/* Clipto logo / text at top */}
        <div className="flex items-center justify-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-sky-400 flex items-center justify-center text-black shadow-lg shadow-cyan-950/50">
            <Film className="w-7 h-7 text-black stroke-[2.2]" />
          </div>
          <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Clipto
          </span>
        </div>

        {/* Short headline explaining that Clipto turns YouTube videos into short clips */}
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white max-w-2xl mx-auto leading-tight sm:leading-tight">
          Turn YouTube videos into short clips.
        </h1>

        <p className="text-sm sm:text-base text-slate-400 mt-4 max-w-xl mx-auto leading-relaxed">
          Create sequential 1-minute video segments automatically, or select a custom portion under 1 minute for instant MP4 export.
        </p>

        {/* YouTube URL input box & "Login to Start" Button */}
        <form
          onSubmit={handleSubmit}
          className={`mt-8 sm:mt-10 max-w-xl mx-auto bg-[#0b0f19] border rounded-2xl p-2 shadow-2xl flex flex-col sm:flex-row gap-2 transition-colors ${
            validationError ? 'border-red-500/60 ring-1 ring-red-500/30' : 'border-[#1e293b]'
          }`}
        >
          <div className="relative flex-1 flex items-center">
            <Film className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
            <input
              id="landing-youtube-url-input"
              type="text"
              value={url}
              onChange={handleUrlChange}
              placeholder="Paste YouTube URL (e.g., youtube.com/watch?v=...)"
              className="w-full min-h-[48px] bg-transparent pl-10 pr-3 text-xs sm:text-sm text-white placeholder-slate-500 outline-none"
            />
          </div>

          <button
            id="login-to-start-btn"
            type="submit"
            className="min-h-[48px] px-6 py-3 rounded-xl font-semibold text-xs sm:text-sm bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-black shadow-md shadow-cyan-950 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <span>Login to Start</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Empty URL & Invalid URL Feedback Messages */}
        {validationError === 'empty' && (
          <div
            id="landing-empty-url-error"
            className="mt-3 max-w-xl mx-auto p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-center justify-center gap-2 animate-in fade-in duration-150"
          >
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Please enter a YouTube video URL to start clipping.</span>
          </div>
        )}

        {validationError === 'invalid' && (
          <div
            id="landing-invalid-url-error"
            className="mt-3 max-w-xl mx-auto p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-200 flex items-center justify-center gap-2 animate-in fade-in duration-150"
          >
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>Invalid YouTube URL. Please enter a link like youtube.com/watch?v=... or youtu.be/...</span>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500">
          <span>Paste any YouTube URL to begin.</span>
          <span>•</span>
          <button
            type="button"
            onClick={() => onLoginToStart('')}
            className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors cursor-pointer"
          >
            Already have an account? Sign in directly
          </button>
        </div>

        {/* Quick sample URL helper */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="text-[11px] text-slate-500">Try sample:</span>
          <button
            type="button"
            onClick={() => {
              setUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
              setValidationError(null);
            }}
            className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 underline underline-offset-2 cursor-pointer"
          >
            Rick Astley - Never Gonna Give You Up
          </button>
        </div>
      </section>

      {/* Two Core Clipping Methods Visualized */}
      <section className="w-full max-w-4xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Auto Clip Card */}
          <div className="bg-[#0b0f19] border border-[#1e293b] rounded-2xl p-6 hover:border-slate-700 transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#0e1422] border border-[#1e293b] flex items-center justify-center text-cyan-400 mb-4">
                <Layers className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-semibold">
                Option 1
              </span>
              <h2 className="text-lg font-bold text-white mt-1 mb-2">Auto Clip</h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Automatically splits the video into sequential 1-minute clips (0:00–1:00, 1:00–2:00, etc.) in convenient batches of 5 clips.
              </p>
            </div>
            <div className="pt-4 border-t border-[#1e293b] flex items-center justify-between text-xs text-slate-400">
              <span>Free: 5 clips/day</span>
              <span className="text-cyan-400 font-mono font-medium">Auto Sequential</span>
            </div>
          </div>

          {/* Custom Clip Card */}
          <div className="bg-[#0b0f19] border border-[#1e293b] rounded-2xl p-6 hover:border-slate-700 transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#0e1422] border border-[#1e293b] flex items-center justify-center text-sky-400 mb-4">
                <Scissors className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-sky-400 font-semibold">
                Option 2
              </span>
              <h2 className="text-lg font-bold text-white mt-1 mb-2">Custom Clip</h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Choose exactly which part of the video you want to clip with an interactive timeline. Strict maximum duration of 1 minute.
              </p>
            </div>
            <div className="pt-4 border-t border-[#1e293b] flex items-center justify-between text-xs text-slate-400">
              <span>Free: 2 clips/day</span>
              <span className="text-sky-400 font-mono font-medium">Interactive Timeline</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
