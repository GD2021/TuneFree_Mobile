import { useCallback, useEffect, useRef, useState } from "react";
import { PlayMode, Song } from "../../types";

const getLocal = <T,>(key: string, def: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : def;
  } catch {
    return def;
  }
};

export interface UsePlaybackQueueResult {
  queue: Song[];
  playMode: PlayMode;
  queueRef: React.MutableRefObject<Song[]>;
  playModeRef: React.MutableRefObject<PlayMode>;
  setQueue: React.Dispatch<React.SetStateAction<Song[]>>;
  setPlayMode: React.Dispatch<React.SetStateAction<PlayMode>>;
  addToQueue: (song: Song) => void;
  removeFromQueue: (songId: string | number) => void;
  clearQueue: () => void;
  togglePlayMode: () => void;
}

export const usePlaybackQueue = (): UsePlaybackQueueResult => {
  const [queue, setQueue] = useState<Song[]>(() =>
    getLocal("tunefree_queue", []),
  );
  const [playMode, setPlayMode] = useState<PlayMode>(() =>
    getLocal("tunefree_play_mode", "sequence"),
  );

  const queueRef = useRef(queue);
  const playModeRef = useRef(playMode);

  useEffect(() => {
    localStorage.setItem("tunefree_queue", JSON.stringify(queue));
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    localStorage.setItem("tunefree_play_mode", JSON.stringify(playMode));
    playModeRef.current = playMode;
  }, [playMode]);

  const addToQueue = useCallback((song: Song) => {
    setQueue((prev) => {
      if (prev.find((s) => String(s.id) === String(song.id))) return prev;
      return [...prev, song];
    });
  }, []);

  const removeFromQueue = useCallback((songId: string | number) => {
    setQueue((prev) => prev.filter((s) => String(s.id) !== String(songId)));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  const togglePlayMode = useCallback(() => {
    setPlayMode((prev) => {
      if (prev === "sequence") return "loop";
      if (prev === "loop") return "shuffle";
      return "sequence";
    });
  }, []);

  return {
    queue,
    playMode,
    queueRef,
    playModeRef,
    setQueue,
    setPlayMode,
    addToQueue,
    removeFromQueue,
    clearQueue,
    togglePlayMode,
  };
};
