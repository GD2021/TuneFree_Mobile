import { useEffect, useRef } from "react";

export interface UsePlaybackTimeSyncOptions {
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  setCurrentTime: React.Dispatch<React.SetStateAction<number>>;
  /**
   * Minimum delta (seconds) required to update state.
   * Helps reduce re-renders when time changes are tiny.
   */
  minDeltaSeconds?: number;
}

export const usePlaybackTimeSync = ({
  audioRef,
  isPlaying,
  setCurrentTime,
  minDeltaSeconds = 0.05,
}: UsePlaybackTimeSyncOptions) => {
  const rafIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(-1);

  useEffect(() => {
    let isCancelled = false;

    const tick = () => {
      if (isCancelled) return;

      const audio = audioRef.current;
      if (audio && !audio.paused) {
        const t = audio.currentTime;
        if (Math.abs(t - lastTimeRef.current) >= minDeltaSeconds) {
          lastTimeRef.current = t;
          setCurrentTime(t);
        }
      }

      rafIdRef.current = requestAnimationFrame(tick);
    };

    if (isPlaying && document.visibilityState !== "hidden") {
      rafIdRef.current = requestAnimationFrame(tick);
    }

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
      } else if (isPlaying) {
        if (rafIdRef.current === null) {
          rafIdRef.current = requestAnimationFrame(tick);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      isCancelled = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [audioRef, isPlaying, minDeltaSeconds, setCurrentTime]);
};
