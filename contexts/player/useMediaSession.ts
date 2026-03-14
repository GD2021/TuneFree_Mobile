import { useCallback } from "react";
import { Song } from "../../types";

type PlaybackState = "playing" | "paused";

export const useMediaSession = () => {
  const updateMediaSession = useCallback(
    (song: Song | null, state: PlaybackState) => {
      if (!("mediaSession" in navigator) || !song) return;
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.name,
        artist: song.artist,
        album: song.album || "TuneFree Music",
        artwork: song.pic
          ? [
              { src: song.pic, sizes: "96x96", type: "image/jpeg" },
              { src: song.pic, sizes: "128x128", type: "image/jpeg" },
              { src: song.pic, sizes: "192x192", type: "image/jpeg" },
              { src: song.pic, sizes: "256x256", type: "image/jpeg" },
              { src: song.pic, sizes: "384x384", type: "image/jpeg" },
              { src: song.pic, sizes: "512x512", type: "image/jpeg" },
            ]
          : [],
      });
      navigator.mediaSession.playbackState = state;
    },
    [],
  );

  const updatePositionState = useCallback((audio: HTMLAudioElement | null) => {
    if (!audio || !("mediaSession" in navigator) || isNaN(audio.duration)) {
      return;
    }
    try {
      navigator.mediaSession.setPositionState({
        duration: audio.duration,
        playbackRate: audio.playbackRate,
        position: audio.currentTime,
      });
    } catch {
      /* ignore */
    }
  }, []);

  return { updateMediaSession, updatePositionState };
};
