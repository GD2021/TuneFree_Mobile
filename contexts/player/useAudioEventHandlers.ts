import { useMemo } from "react";
import { Song, AudioQuality } from "../../types";

export interface AudioEventHandlersDeps {
  setDuration: React.Dispatch<React.SetStateAction<number>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;

  currentSongRef: React.MutableRefObject<Song | null>;
  audioQualityRef: React.MutableRefObject<AudioQuality>;
  retryCountRef: React.MutableRefObject<number>;
  playSongRef: React.MutableRefObject<
    (song: Song, forceQuality?: AudioQuality) => Promise<void>
  >;

  onEnded: () => void;
  updatePositionState: (audio: HTMLAudioElement | null) => void;
}

export interface AudioEngineHandlers {
  onTimeUpdate?: (audio: HTMLAudioElement) => void;
  onLoadedMetadata?: (audio: HTMLAudioElement) => void;
  onEnded?: (audio: HTMLAudioElement) => void;
  onError?: (audio: HTMLAudioElement) => void;
  onWaiting?: (audio: HTMLAudioElement) => void;
  onCanPlay?: (audio: HTMLAudioElement) => void;
}

export const useAudioEventHandlers = ({
  setDuration,
  setIsLoading,
  setIsPlaying,
  currentSongRef,
  audioQualityRef,
  retryCountRef,
  playSongRef,
  onEnded,
  updatePositionState,
}: AudioEventHandlersDeps): AudioEngineHandlers => {
  return useMemo(
    () => ({
      onLoadedMetadata: (audio: HTMLAudioElement) => {
        setDuration(audio.duration);
        setIsLoading(false);
        retryCountRef.current = 0;
        updatePositionState(audio);
      },
      onEnded: () => {
        onEnded();
      },
      onError: (audio: HTMLAudioElement) => {
        if (
          currentSongRef.current &&
          audioQualityRef.current !== "128k" &&
          retryCountRef.current === 0
        ) {
          retryCountRef.current = 1;
          playSongRef.current(currentSongRef.current, "128k");
          return;
        }

        setIsLoading(false);
        setIsPlaying(false);
        retryCountRef.current = 0;
      },
      onWaiting: () => setIsLoading(true),
      onCanPlay: () => setIsLoading(false),
    }),
    [
      setDuration,
      setIsLoading,
      setIsPlaying,
      currentSongRef,
      audioQualityRef,
      retryCountRef,
      playSongRef,
      onEnded,
      updatePositionState,
    ],
  );
};
