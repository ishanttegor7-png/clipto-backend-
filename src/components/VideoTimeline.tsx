import React, { useRef, useState, useEffect, useCallback } from 'react';
import { formatSecondsToTime } from '../utils/youtube';
import { AlertCircle, Clock } from 'lucide-react';

interface VideoTimelineProps {
  totalDurationSeconds?: number; // e.g. 600s (10 mins)
  startTime: number;             // in seconds
  endTime: number;               // in seconds
  onChange: (start: number, end: number) => void;
}

export const VideoTimeline: React.FC<VideoTimelineProps> = ({
  totalDurationSeconds = 600,
  startTime,
  endTime,
  onChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeDrag, setActiveDrag] = useState<'start' | 'end' | 'range' | null>(null);
  const dragStartXRef = useRef<number>(0);
  const initialTimesRef = useRef<{ start: number; end: number }>({ start: startTime, end: endTime });

  const MAX_CLIP_DURATION = 60; // strictly 1 minute

  // Convert pixel position to seconds
  const getSecondsFromX = useCallback(
    (clientX: number): number => {
      if (!containerRef.current) return 0;
      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percentage = relativeX / rect.width;
      return Math.round(percentage * totalDurationSeconds);
    },
    [totalDurationSeconds]
  );

  // Handle pointer down on start handle
  const handleStartPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setActiveDrag('start');
  };

  // Handle pointer down on end handle
  const handleEndPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setActiveDrag('end');
  };

  // Handle pointer down on middle range to slide window
  const handleRangePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setActiveDrag('range');
    dragStartXRef.current = e.clientX;
    initialTimesRef.current = { start: startTime, end: endTime };
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!activeDrag || !containerRef.current) return;

      if (activeDrag === 'start') {
        let newStart = getSecondsFromX(e.clientX);
        // Ensure newStart >= 0 and newStart <= endTime - 1
        newStart = Math.max(0, Math.min(newStart, endTime - 1));

        // Enforce max 1 minute duration (endTime - newStart <= 60)
        if (endTime - newStart > MAX_CLIP_DURATION) {
          newStart = endTime - MAX_CLIP_DURATION;
        }
        onChange(newStart, endTime);
      } else if (activeDrag === 'end') {
        let newEnd = getSecondsFromX(e.clientX);
        // Ensure newEnd <= totalDuration and newEnd >= startTime + 1
        newEnd = Math.min(totalDurationSeconds, Math.max(newEnd, startTime + 1));

        // Enforce max 1 minute duration (newEnd - startTime <= 60)
        if (newEnd - startTime > MAX_CLIP_DURATION) {
          newEnd = startTime + MAX_CLIP_DURATION;
        }
        onChange(startTime, newEnd);
      } else if (activeDrag === 'range') {
        const deltaX = e.clientX - dragStartXRef.current;
        const rect = containerRef.current.getBoundingClientRect();
        const deltaSeconds = Math.round((deltaX / rect.width) * totalDurationSeconds);
        const duration = initialTimesRef.current.end - initialTimesRef.current.start;

        let newStart = initialTimesRef.current.start + deltaSeconds;
        let newEnd = initialTimesRef.current.end + deltaSeconds;

        if (newStart < 0) {
          newStart = 0;
          newEnd = duration;
        } else if (newEnd > totalDurationSeconds) {
          newEnd = totalDurationSeconds;
          newStart = totalDurationSeconds - duration;
        }

        onChange(newStart, newEnd);
      }
    };

    const handlePointerUp = () => {
      setActiveDrag(null);
    };

    if (activeDrag) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [activeDrag, startTime, endTime, totalDurationSeconds, getSecondsFromX, onChange]);

  const startPercent = (startTime / totalDurationSeconds) * 100;
  const endPercent = (endTime / totalDurationSeconds) * 100;
  const currentDuration = endTime - startTime;

  return (
    <div className="w-full bg-[#0b0f19] border border-[#1e293b] rounded-2xl p-4 sm:p-5 text-slate-200 select-none">
      {/* Timeline Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[#1e293b]/70">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Video Timeline Selector
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Total Video:</span>
          <span className="font-mono text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded">
            {formatSecondsToTime(totalDurationSeconds)}
          </span>
          <span className="text-[11px] text-cyan-400 font-medium bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded flex items-center gap-1">
            <span>Max 1:00 limit</span>
          </span>
        </div>
      </div>

      {/* Horizontal Interactive Timeline Track */}
      <div className="relative pt-6 pb-4">
        {/* Track time markers */}
        <div className="flex justify-between text-[10px] font-mono text-slate-500 mb-2 px-1">
          <span>00:00</span>
          <span>02:30</span>
          <span>05:00</span>
          <span>07:30</span>
          <span>10:00</span>
        </div>

        {/* Outer Track Bar */}
        <div
          ref={containerRef}
          className="relative h-14 w-full bg-[#0e1422] border border-[#1e293b] rounded-xl overflow-hidden cursor-pointer"
        >
          {/* Film strip simulated thumb frames background */}
          <div className="absolute inset-0 opacity-15 flex">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 border-r border-slate-700 bg-slate-800/30 h-full flex items-center justify-center text-[9px] font-mono text-slate-600"
              >
                |
              </div>
            ))}
          </div>

          {/* Selected Highlight Window */}
          <div
            id="timeline-selected-range"
            onPointerDown={handleRangePointerDown}
            className="absolute top-0 bottom-0 bg-cyan-500/20 border-y-2 border-cyan-400 cursor-grab active:cursor-grabbing backdrop-blur-[1px] flex items-center justify-center transition-none"
            style={{
              left: `${startPercent}%`,
              width: `${Math.max(1, endPercent - startPercent)}%`,
            }}
          >
            <div className="text-[10px] font-mono font-bold text-cyan-300 bg-black/70 px-2 py-0.5 rounded border border-cyan-500/30 shadow select-none pointer-events-none truncate">
              {formatSecondsToTime(currentDuration)}
            </div>
          </div>

          {/* Start Handle (Draggable) */}
          <div
            id="timeline-start-handle"
            onPointerDown={handleStartPointerDown}
            className="absolute top-0 bottom-0 -ml-3 w-6 z-20 flex items-center justify-center cursor-ew-resize group/start touch-none"
            style={{ left: `${startPercent}%` }}
          >
            <div className="w-4 h-full bg-cyan-400 hover:bg-cyan-300 rounded-l-md shadow-lg flex items-center justify-center border-y border-l border-white/20 transition-colors">
              <div className="w-0.5 h-6 bg-black/60 rounded-full" />
            </div>
            {/* Timestamp tooltip */}
            <div className="absolute -top-7 bg-black/90 text-cyan-300 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border border-cyan-500/30 pointer-events-none whitespace-nowrap">
              {formatSecondsToTime(startTime)}
            </div>
          </div>

          {/* End Handle (Draggable) */}
          <div
            id="timeline-end-handle"
            onPointerDown={handleEndPointerDown}
            className="absolute top-0 bottom-0 -mr-3 w-6 z-20 flex items-center justify-center cursor-ew-resize group/end touch-none"
            style={{ left: `${endPercent}%` }}
          >
            <div className="w-4 h-full bg-cyan-400 hover:bg-cyan-300 rounded-r-md shadow-lg flex items-center justify-center border-y border-r border-white/20 transition-colors">
              <div className="w-0.5 h-6 bg-black/60 rounded-full" />
            </div>
            {/* Timestamp tooltip */}
            <div className="absolute -top-7 bg-black/90 text-cyan-300 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border border-cyan-500/30 pointer-events-none whitespace-nowrap">
              {formatSecondsToTime(endTime)}
            </div>
          </div>
        </div>
      </div>

      {/* Numerical Display as strictly specified in prompt:
          Start: 00:00
          End: 01:00
          Duration: 01:00 */}
      <div className="mt-2 pt-3 border-t border-[#1e293b]/70 grid grid-cols-3 gap-2 text-center">
        <div className="bg-[#0e1422] p-2.5 rounded-xl border border-[#1e293b]">
          <span className="text-[11px] text-slate-400 block font-medium">Start</span>
          <span
            id="custom-clip-start-display"
            className="text-base font-bold text-white font-mono"
          >
            {formatSecondsToTime(startTime)}
          </span>
        </div>

        <div className="bg-[#0e1422] p-2.5 rounded-xl border border-[#1e293b]">
          <span className="text-[11px] text-slate-400 block font-medium">End</span>
          <span
            id="custom-clip-end-display"
            className="text-base font-bold text-white font-mono"
          >
            {formatSecondsToTime(endTime)}
          </span>
        </div>

        <div className="bg-[#0e1422] p-2.5 rounded-xl border border-[#1e293b]">
          <span className="text-[11px] text-slate-400 block font-medium">Duration</span>
          <span
            id="custom-clip-duration-display"
            className={`text-base font-bold font-mono ${
              currentDuration >= MAX_CLIP_DURATION ? 'text-amber-400' : 'text-cyan-400'
            }`}
          >
            {formatSecondsToTime(currentDuration)}
          </span>
        </div>
      </div>

      {/* Prevention helper note */}
      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 bg-slate-900/60 px-3 py-2 rounded-lg border border-slate-800">
        <div className="flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>Maximum custom clip duration is strictly 1 minute.</span>
        </div>
        <span className="text-slate-500 hidden sm:inline">Drag handles to adjust</span>
      </div>
    </div>
  );
};
