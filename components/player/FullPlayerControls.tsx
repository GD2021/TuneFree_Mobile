import React from "react";
import { usePlayerState, usePlayerTime, usePlayerActions } from "../../contexts/PlayerContext";
import AudioVisualizer from "../AudioVisualizer";
import {
  PlayIcon,
  PauseIcon,
  NextIcon,
  PrevIcon,
  RepeatIcon,
  RepeatOneIcon,
  ShuffleIcon,
  QueueIcon,
} from "../Icons";

interface FullPlayerControlsProps {
  onOpenQueue: () => void;
}

const formatTime = (seconds: number) => {
  if (isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const FullPlayerControls: React.FC<FullPlayerControlsProps> = ({ onOpenQueue }) => {
  const { currentSong, isPlaying, playMode, queue, duration } = usePlayerState();
  const { currentTime } = usePlayerTime();
  const { seek, togglePlay, playNext, playPrev, togglePlayMode } = usePlayerActions();

  const hasSong = !!currentSong;

  return (
    <div
      className="relative z-30 w-full px-8 pb-safe mb-4"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="mb-2 h-12 flex items-end">
        <AudioVisualizer isPlaying={isPlaying} />
      </div>

      <div className="w-full mb-6 group">
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={(e) => seek(parseFloat(e.target.value))}
          disabled={!hasSong}
          className="w-full h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-black hover:h-1.5 transition-all disabled:opacity-50"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-2 font-medium font-mono tabular-nums">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <button
          onClick={togglePlayMode}
          className={`p-2 transition active:scale-90 ${playMode !== "sequence" ? "text-ios-red" : "text-gray-400 hover:text-gray-600"}`}
        >
          {playMode === "sequence" && <RepeatIcon size={22} />}
          {playMode === "loop" && <RepeatOneIcon size={22} />}
          {playMode === "shuffle" && <ShuffleIcon size={22} />}
        </button>

        <div className="flex items-center gap-8">
          <button
            onClick={playPrev}
            disabled={!hasSong}
            className="text-black hover:opacity-70 transition active:scale-90 disabled:opacity-30"
          >
            <PrevIcon size={40} className="fill-current" />
          </button>
          <button
            onClick={togglePlay}
            disabled={!hasSong}
            className="w-20 h-20 bg-black text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
          >
            {isPlaying ? (
              <PauseIcon size={32} className="fill-current" />
            ) : (
              <PlayIcon size={32} className="fill-current ml-1" />
            )}
          </button>
          <button
            onClick={() => playNext(true)}
            disabled={queue.length === 0}
            className="text-black hover:opacity-70 transition active:scale-90 disabled:opacity-30"
          >
            <NextIcon size={40} className="fill-current" />
          </button>
        </div>

        <button
          onClick={onOpenQueue}
          className="p-2 text-gray-400 hover:text-black transition active:scale-90"
        >
          <QueueIcon size={22} />
        </button>
      </div>
    </div>
  );
};

export default FullPlayerControls;
