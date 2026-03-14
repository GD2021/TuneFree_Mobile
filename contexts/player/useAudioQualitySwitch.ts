import { useCallback } from "react";
import { AudioQuality, Song } from "../../types";

export interface UseAudioQualitySwitchDeps {
  setAudioQualityState: React.Dispatch<React.SetStateAction<AudioQuality>>;
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
  currentSongRef: React.MutableRefObject<Song | null>;
  playSongRef: React.MutableRefObject<
    (song: Song, forceQuality?: AudioQuality) => Promise<void>
  >;
}

export interface UseAudioQualitySwitchResult {
  setAudioQuality: (quality: AudioQuality) => void;
}

export const useAudioQualitySwitch = ({
  setAudioQualityState,
  audioRef,
  currentSongRef,
  playSongRef,
}: UseAudioQualitySwitchDeps): UseAudioQualitySwitchResult => {
  const setAudioQuality = useCallback(
    (quality: AudioQuality) => {
      setAudioQualityState(quality);

      if (
        currentSongRef.current &&
        audioRef.current &&
        !audioRef.current.paused
      ) {
        playSongRef.current(currentSongRef.current, quality);
      }
    },
    [setAudioQualityState, currentSongRef, audioRef, playSongRef],
  );

  return { setAudioQuality };
};
