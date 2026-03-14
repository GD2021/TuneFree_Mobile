import { useEffect } from "react";

export interface MediaSessionActionsOptions {
  onTogglePlay: () => void;
  onPlayNext: () => void;
  onPlayPrev: () => void;
  onSeek: (time: number) => void;
}

export const useMediaSessionActions = ({
  onTogglePlay,
  onPlayNext,
  onPlayPrev,
  onSeek,
}: MediaSessionActionsOptions) => {
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    navigator.mediaSession.setActionHandler("play", () => onTogglePlay());
    navigator.mediaSession.setActionHandler("pause", () => onTogglePlay());
    navigator.mediaSession.setActionHandler("previoustrack", () => onPlayPrev());
    navigator.mediaSession.setActionHandler("nexttrack", () => onPlayNext());
    navigator.mediaSession.setActionHandler("seekto", (details) => {
      if (details.seekTime !== undefined) {
        onSeek(details.seekTime);
      }
    });
  }, [onTogglePlay, onPlayNext, onPlayPrev, onSeek]);
};
