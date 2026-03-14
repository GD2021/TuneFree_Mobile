import { useCallback, useEffect } from "react";
import { AudioQuality, PlayMode, Song } from "../../types";

export interface UsePlaybackNavigationDeps {
  queue: Song[];
  playMode: PlayMode;
  currentSong: Song | null;

  queueRef: React.MutableRefObject<Song[]>;
  playModeRef: React.MutableRefObject<PlayMode>;
  currentSongRef: React.MutableRefObject<Song | null>;

  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
  playSongRef: React.MutableRefObject<
    (song: Song, forceQuality?: AudioQuality) => Promise<void>
  >;

  playNextRef: React.MutableRefObject<((force?: boolean) => void) | null>;
  prefetchParsed: (song: Song, quality: AudioQuality) => Promise<void>;
  audioQuality: AudioQuality;
}

export interface UsePlaybackNavigationResult {
  playNext: (force?: boolean) => void;
  playPrev: () => void;
}

export const usePlaybackNavigation = ({
  queue,
  playMode,
  currentSong,
  queueRef,
  playModeRef,
  currentSongRef,
  audioRef,
  playSongRef,
  playNextRef,
  prefetchParsed,
  audioQuality,
}: UsePlaybackNavigationDeps): UsePlaybackNavigationResult => {
  const playNext = useCallback(
    (force = true) => {
      const q = queueRef.current;
      const c = currentSongRef.current;
      const mode = playModeRef.current;

      if (q.length === 0) return;

      if (!force && mode === "loop") {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current
            .play()
            .catch((e) => console.warn("单曲循环重播失败:", e));
        }
        return;
      }

      const currentIndex = c
        ? q.findIndex((s) => String(s.id) === String(c.id))
        : -1;
      let nextIndex = 0;

      if (mode === "shuffle") {
        do {
          nextIndex = Math.floor(Math.random() * q.length);
        } while (q.length > 1 && nextIndex === currentIndex);
      } else {
        nextIndex = (currentIndex + 1) % q.length;
      }

      playSongRef.current(q[nextIndex]);
    },
    [audioRef, currentSongRef, playModeRef, playSongRef, queueRef],
  );

  const playPrev = useCallback(() => {
    const q = queueRef.current;
    const c = currentSongRef.current;
    const mode = playModeRef.current;

    if (q.length === 0) return;
    const currentIndex = c
      ? q.findIndex((s) => String(s.id) === String(c.id))
      : -1;
    let prevIndex = 0;

    if (mode === "shuffle") {
      prevIndex = Math.floor(Math.random() * q.length);
    } else {
      prevIndex = (currentIndex - 1 + q.length) % q.length;
    }
    playSongRef.current(q[prevIndex]);
  }, [currentSongRef, playModeRef, playSongRef, queueRef]);

  useEffect(() => {
    playNextRef.current = playNext;
  }, [playNext, playNextRef]);

  useEffect(() => {
    if (!currentSong || queue.length === 0) return;
    if (playMode === "shuffle") return;

    const currentIndex = queue.findIndex(
      (s) => String(s.id) === String(currentSong.id),
    );
    const nextIndex = (currentIndex + 1) % queue.length;
    const nextSong = queue[nextIndex];

    if (nextSong && String(nextSong.id) !== String(currentSong.id)) {
      prefetchParsed(nextSong, audioQuality);
    }
  }, [currentSong, queue, playMode, audioQuality, prefetchParsed]);

  return { playNext, playPrev };
};
