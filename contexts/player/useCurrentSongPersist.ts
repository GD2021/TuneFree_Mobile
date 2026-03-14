import { useEffect, useRef, useState } from "react";
import { Song } from "../../types";

const getLocal = <T,>(key: string, def: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : def;
  } catch {
    return def;
  }
};

export interface UseCurrentSongPersistResult {
  currentSong: Song | null;
  setCurrentSong: React.Dispatch<React.SetStateAction<Song | null>>;
  currentSongRef: React.MutableRefObject<Song | null>;
}

export const useCurrentSongPersist = (
  storageKey: string = "tunefree_current_song",
): UseCurrentSongPersistResult => {
  const [currentSong, setCurrentSong] = useState<Song | null>(() =>
    getLocal(storageKey, null),
  );
  const currentSongRef = useRef<Song | null>(currentSong);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(currentSong));
    currentSongRef.current = currentSong;
  }, [currentSong, storageKey]);

  return {
    currentSong,
    setCurrentSong,
    currentSongRef,
  };
};
