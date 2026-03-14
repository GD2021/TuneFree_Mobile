import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Song, PlayMode, AudioQuality } from "../types";
import { useAudioEngine } from "./player/useAudioEngine";
import { useParsedCache } from "./player/useParsedCache";
import { useMediaSession } from "./player/useMediaSession";
import { usePlaybackQueue } from "./player/usePlaybackQueue";
import { usePlaybackController } from "./player/usePlaybackController";
import { usePlaybackNavigation } from "./player/usePlaybackNavigation";
import { useMediaSessionActions } from "./player/useMediaSessionActions";
import { useAudioEventHandlers } from "./player/useAudioEventHandlers";
import { useAudioSettings } from "./player/useAudioSettings";
import { useCurrentSongPersist } from "./player/useCurrentSongPersist";
import { useAudioQualitySwitch } from "./player/useAudioQualitySwitch";
import { usePlaybackTimeSync } from "./player/usePlaybackTimeSync";

interface PlayerContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playMode: PlayMode;
  queue: Song[];
  analyser: AnalyserNode | null;
  audioQuality: AudioQuality;
  playSong: (song: Song, forceQuality?: AudioQuality) => Promise<void>;
  togglePlay: () => void;
  seek: (time: number) => void;
  playNext: (force?: boolean) => void;
  playPrev: () => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (songId: string | number) => void;
  togglePlayMode: () => void;
  clearQueue: () => void;
  setAudioQuality: (quality: AudioQuality) => void;
  prefetchSong: (song: Song, quality?: AudioQuality) => void;
  initAudioContext: () => void;
}

interface PlayerStateValue {
  currentSong: Song | null;
  isPlaying: boolean;
  isLoading: boolean;
  duration: number;
  volume: number;
  playMode: PlayMode;
  queue: Song[];
  analyser: AnalyserNode | null;
  audioQuality: AudioQuality;
}

interface PlayerTimeValue {
  currentTime: number;
}

interface PlayerActionsValue {
  playSong: (song: Song, forceQuality?: AudioQuality) => Promise<void>;
  togglePlay: () => void;
  seek: (time: number) => void;
  playNext: (force?: boolean) => void;
  playPrev: () => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (songId: string | number) => void;
  togglePlayMode: () => void;
  clearQueue: () => void;
  setAudioQuality: (quality: AudioQuality) => void;
  prefetchSong: (song: Song, quality?: AudioQuality) => void;
  initAudioContext: () => void;
}

const PLAYER_STATE_DEFAULTS: PlayerStateValue = {
  currentSong: null,
  isPlaying: false,
  isLoading: false,
  duration: 0,
  volume: 1,
  playMode: "sequence",
  queue: [],
  analyser: null,
  audioQuality: "320k",
};

const PLAYER_TIME_DEFAULTS: PlayerTimeValue = {
  currentTime: 0,
};

const PLAYER_ACTIONS_DEFAULTS: PlayerActionsValue = {
  playSong: async () => {},
  togglePlay: () => {},
  seek: () => {},
  playNext: () => {},
  playPrev: () => {},
  addToQueue: () => {},
  removeFromQueue: () => {},
  togglePlayMode: () => {},
  clearQueue: () => {},
  setAudioQuality: () => {},
  prefetchSong: () => {},
  initAudioContext: () => {},
};

const PlayerStateContext = createContext<PlayerStateValue>(
  PLAYER_STATE_DEFAULTS,
);
const PlayerTimeContext = createContext<PlayerTimeValue>(PLAYER_TIME_DEFAULTS);
const PlayerActionsContext = createContext<PlayerActionsValue>(
  PLAYER_ACTIONS_DEFAULTS,
);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { currentSong, setCurrentSong, currentSongRef } =
    useCurrentSongPersist();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const {
    audioQuality,
    setAudioQuality: setAudioQualityState,
    audioQualityRef,
    volume,
  } = useAudioSettings();

  const playNextRef = useRef<((force?: boolean) => void) | null>(null);
  const playSongRef = useRef<
    (song: Song, forceQuality?: AudioQuality) => Promise<void>
  >(async () => {});
  const retryCountRef = useRef(0);

  const { updateMediaSession, updatePositionState } = useMediaSession();
  const {
    getParsedCacheKey,
    getCachedParsed,
    setCachedParsed,
    prefetchParsed,
  } = useParsedCache(4 * 60 * 1000);

  const handlers = useAudioEventHandlers({
    setDuration,
    setIsLoading,
    setIsPlaying,
    currentSongRef,
    audioQualityRef,
    retryCountRef,
    playSongRef,
    onEnded: () => {
      if (playNextRef.current) playNextRef.current(false);
    },
    updatePositionState,
  });

  const {
    audioRef,
    audioCtxRef,
    analyser,
    createAudioElement,
    initAudioContext,
  } = useAudioEngine({ handlers });

  usePlaybackTimeSync({
    audioRef,
    isPlaying,
    setCurrentTime,
    minDeltaSeconds: 0.05,
  });

  const {
    queue,
    playMode,
    queueRef,
    playModeRef,
    setQueue,
    addToQueue,
    removeFromQueue,
    clearQueue,
    togglePlayMode,
  } = usePlaybackQueue();

  const { playSong, togglePlay, seek, prefetchSong } = usePlaybackController({
    audioRef,
    audioCtxRef,
    createAudioElement,
    initAudioContext,
    currentSongRef,
    audioQualityRef,
    playNextRef,
    playSongRef,
    setCurrentSong,
    setQueue,
    setIsPlaying,
    setIsLoading,
    setCurrentTime,
    updateMediaSession,
    updatePositionState,
    getParsedCacheKey,
    getCachedParsed,
    setCachedParsed,
    prefetchParsed,
    retryCountRef,
  });

  const { playNext, playPrev } = usePlaybackNavigation({
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
  });

  useMediaSessionActions({
    onTogglePlay: togglePlay,
    onPlayNext: () => playNext(true),
    onPlayPrev: playPrev,
    onSeek: seek,
  });

  useEffect(() => {
    if (currentSong) {
      updateMediaSession(currentSong, isPlaying ? "playing" : "paused");
    }
  }, [currentSong, isPlaying, updateMediaSession]);

  const { setAudioQuality } = useAudioQualitySwitch({
    setAudioQualityState,
    audioRef,
    currentSongRef,
    playSongRef,
  });

  const stateValue = useMemo<PlayerStateValue>(
    () => ({
      currentSong,
      isPlaying,
      isLoading,
      duration,
      volume,
      playMode,
      queue,
      analyser,
      audioQuality,
    }),
    [
      currentSong,
      isPlaying,
      isLoading,
      duration,
      volume,
      playMode,
      queue,
      analyser,
      audioQuality,
    ],
  );

  const timeValue = useMemo<PlayerTimeValue>(
    () => ({
      currentTime,
    }),
    [currentTime],
  );

  const actionsValue = useMemo<PlayerActionsValue>(
    () => ({
      playSong,
      togglePlay,
      seek,
      playNext,
      playPrev,
      addToQueue,
      removeFromQueue,
      togglePlayMode,
      clearQueue,
      setAudioQuality,
      prefetchSong,
      initAudioContext,
    }),
    [
      playSong,
      togglePlay,
      seek,
      playNext,
      playPrev,
      addToQueue,
      removeFromQueue,
      togglePlayMode,
      clearQueue,
      setAudioQuality,
      prefetchSong,
      initAudioContext,
    ],
  );

  return (
    <PlayerStateContext.Provider value={stateValue}>
      <PlayerTimeContext.Provider value={timeValue}>
        <PlayerActionsContext.Provider value={actionsValue}>
          {children}
        </PlayerActionsContext.Provider>
      </PlayerTimeContext.Provider>
    </PlayerStateContext.Provider>
  );
};

export const usePlayerState = () => useContext(PlayerStateContext);
export const usePlayerTime = () => useContext(PlayerTimeContext);
export const usePlayerActions = () => useContext(PlayerActionsContext);

export const usePlayer = (): PlayerContextType => {
  const state = usePlayerState();
  const time = usePlayerTime();
  const actions = usePlayerActions();

  return {
    ...state,
    ...time,
    ...actions,
  };
};
