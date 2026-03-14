import { useCallback, useEffect, useRef } from "react";
import { Song, AudioQuality } from "../../types";
import { parseSongFull } from "../../services/api";

type MediaSessionUpdater = (
  song: Song | null,
  state: "playing" | "paused",
) => void;
type PositionStateUpdater = (audio: HTMLAudioElement | null) => void;

export type PlaybackControllerDeps = {
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
  audioCtxRef: React.MutableRefObject<AudioContext | null>;
  createAudioElement: (withCors: boolean) => HTMLAudioElement;
  initAudioContext: () => void;

  currentSongRef: React.MutableRefObject<Song | null>;
  audioQualityRef: React.MutableRefObject<AudioQuality>;
  playNextRef: React.MutableRefObject<((force?: boolean) => void) | null>;
  playSongRef: React.MutableRefObject<
    (song: Song, forceQuality?: AudioQuality) => Promise<void>
  >;

  setCurrentSong: React.Dispatch<React.SetStateAction<Song | null>>;
  setQueue: React.Dispatch<React.SetStateAction<Song[]>>;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentTime: React.Dispatch<React.SetStateAction<number>>;

  updateMediaSession: MediaSessionUpdater;
  updatePositionState: PositionStateUpdater;

  getParsedCacheKey: (
    id: string | number,
    source: string,
    quality: string,
  ) => string;
  getCachedParsed: (
    key: string,
  ) => { url: string | null; lrc: string; pic: string; ts: number } | null;
  setCachedParsed: (
    key: string,
    data: { url: string | null; lrc: string; pic: string },
  ) => void;
  prefetchParsed: (song: Song, quality: AudioQuality) => Promise<void>;

  retryCountRef: React.MutableRefObject<number>;
};

export const usePlaybackController = ({
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
}: PlaybackControllerDeps) => {
  const prefetchThrottleRef = useRef<Map<string, number>>(new Map());
  const inflightParseRef = useRef<
    Map<
      string,
      Promise<{ url: string | null; lrc: string; pic: string } | null>
    >
  >(new Map());

  const parseFullDedup = useCallback(
    (song: Song, quality: AudioQuality) => {
      const key = getParsedCacheKey(song.id, song.source, quality);
      const existing = inflightParseRef.current.get(key);
      if (existing) return existing;

      const task = parseSongFull(song.id, song.source, quality)
        .then((result) => {
          inflightParseRef.current.delete(key);
          return result;
        })
        .catch((err) => {
          inflightParseRef.current.delete(key);
          throw err;
        });

      inflightParseRef.current.set(key, task);
      return task;
    },
    [getParsedCacheKey],
  );

  const prefetchSong = useCallback(
    (song: Song, quality?: AudioQuality) => {
      const q = quality || audioQualityRef.current;
      const key = `${song.source}:${song.id}:${q}`;
      const now = performance.now();
      const last = prefetchThrottleRef.current.get(key) || 0;
      if (now - last < 500) return;
      prefetchThrottleRef.current.set(key, now);
      prefetchParsed(song, q);
    },
    [audioQualityRef, prefetchParsed],
  );

  const playSong = useCallback(
    async (song: Song, forceQuality?: AudioQuality) => {
      if (!audioRef.current) return;

      // Stop previous track immediately when switching songs
      if (currentSongRef.current && currentSongRef.current.id !== song.id) {
        const audio = audioRef.current;
        audio.pause();
        audio.currentTime = 0;
        audio.removeAttribute("src");
        audio.load();
        setIsPlaying(false);
        setIsLoading(true);
      }

      const targetQuality = forceQuality || audioQualityRef.current;
      const isSameSong = currentSongRef.current?.id === song.id;
      const isDifferentQuality =
        forceQuality && forceQuality !== audioQualityRef.current;

      if (isSameSong && !isDifferentQuality && !forceQuality) {
        if (
          audioRef.current.src &&
          audioRef.current.src !== window.location.href
        ) {
          if (!audioRef.current.paused) {
            audioRef.current.pause();
            setIsPlaying(false);
            updateMediaSession(currentSongRef.current, "paused");
          } else {
            audioRef.current.play().catch(() => {});
            setIsPlaying(true);
            updateMediaSession(currentSongRef.current, "playing");
          }
          return;
        }
      }

      setIsLoading(true);
      if (!forceQuality) {
        retryCountRef.current = 0;
      }

      let fullSong = { ...song };
      setCurrentSong(fullSong);

      setQueue((prev) => {
        if (prev.find((s) => String(s.id) === String(song.id))) return prev;
        return [...prev, fullSong];
      });

      try {
        const cacheKey = getParsedCacheKey(song.id, song.source, targetQuality);
        const cached = getCachedParsed(cacheKey);
        const fromUrl = !cached && !!song.url;

        let parsed = cached
          ? { url: cached.url, lrc: cached.lrc, pic: cached.pic }
          : null;

        if (!parsed && song.url) {
          parsed = {
            url: song.url,
            lrc: song.lrc || "",
            pic: song.pic || "",
          };
          setCachedParsed(cacheKey, parsed);
        }

        if (!parsed) {
          parsed = await parseFullDedup(song, targetQuality);
          if (parsed) {
            setCachedParsed(cacheKey, parsed);
          }
        }

        if (parsed && (!cached?.lrc || !cached?.pic || fromUrl)) {
          parseFullDedup(song, targetQuality)
            .then((fresh) => {
              if (!fresh) return;
              setCachedParsed(cacheKey, fresh);
              if (currentSongRef.current?.id !== song.id) return;
              const patch: Partial<Song> = {};
              if (fresh.pic && !currentSongRef.current?.pic)
                patch.pic = fresh.pic;
              if (fresh.lrc && !currentSongRef.current?.lrc)
                patch.lrc = fresh.lrc;
              if (Object.keys(patch).length > 0) {
                setCurrentSong((prev) =>
                  prev && prev.id === song.id ? { ...prev, ...patch } : prev,
                );
                setQueue((prev) =>
                  prev.map((s) =>
                    String(s.id) === String(song.id) ? { ...s, ...patch } : s,
                  ),
                );
              }
            })
            .catch(() => {});
        }

        if (currentSongRef.current?.id !== song.id) {
          return;
        }

        if (parsed) {
          if ((parsed.pic && !fullSong.pic) || parsed.lrc) {
            const patch: Partial<Song> = {};
            if (parsed.pic && !fullSong.pic) patch.pic = parsed.pic;
            if (parsed.lrc) patch.lrc = parsed.lrc;
            fullSong = { ...fullSong, ...patch };
            setCurrentSong((prev) =>
              prev && prev.id === song.id ? { ...prev, ...patch } : prev,
            );
            setQueue((prev) =>
              prev.map((s) =>
                String(s.id) === String(song.id) ? { ...s, ...patch } : s,
              ),
            );
          }
        }

        const url = parsed?.url || null;

        if (url) {
          fullSong.url = url;
          const resumeTime =
            isSameSong && isDifferentQuality ? audioRef.current.currentTime : 0;

          const needsCors =
            !url.includes("kuwo.cn") && !url.includes("sycdn.kuwo");

          if (!needsCors) {
            if (audioRef.current.crossOrigin) {
              createAudioElement(false);
            }
          } else {
            if (!audioRef.current.crossOrigin) {
              createAudioElement(true);
            }
            initAudioContext();
          }

          audioRef.current.src = url;
          audioRef.current.load();

          if (resumeTime > 0) {
            audioRef.current.currentTime = resumeTime;
          }

          if (
            audioCtxRef.current &&
            audioCtxRef.current.state === "suspended"
          ) {
            audioCtxRef.current.resume();
          }

          setIsPlaying(true);
          setIsLoading(false);

          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                updateMediaSession(fullSong, "playing");
              })
              .catch((error) => {
                if (error.name === "AbortError") {
                  return;
                }

                if (
                  (error.name === "NotSupportedError" ||
                    error.message.includes("source")) &&
                  retryCountRef.current === 0 &&
                  targetQuality !== "128k"
                ) {
                  retryCountRef.current = 1;
                  playSongRef.current(song, "128k");
                  return;
                }

                if (error.name === "NotAllowedError") {
                  setIsPlaying(false);
                  setIsLoading(false);
                }
              });
          }
        } else {
          if (targetQuality !== "128k" && retryCountRef.current === 0) {
            retryCountRef.current = 1;
            playSongRef.current(song, "128k");
            return;
          }

          setIsLoading(false);
          setIsPlaying(false);
        }
      } catch (err) {
        setIsLoading(false);
        console.error("Error in playSong", err);
      }
    },
    [
      audioRef,
      audioCtxRef,
      audioQualityRef,
      createAudioElement,
      currentSongRef,
      getCachedParsed,
      getParsedCacheKey,
      initAudioContext,
      playSongRef,
      retryCountRef,
      setCachedParsed,
      setCurrentSong,
      setIsLoading,
      setIsPlaying,
      setQueue,
      updateMediaSession,
    ],
  );

  useEffect(() => {
    playSongRef.current = playSong;
  }, [playSongRef, playSong]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !currentSongRef.current) return;

    if (
      !audioRef.current.src ||
      audioRef.current.src === window.location.href
    ) {
      playSongRef.current(currentSongRef.current);
      return;
    }

    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }

    if (!audioRef.current.paused) {
      audioRef.current.pause();
      setIsPlaying(false);
      updateMediaSession(currentSongRef.current, "paused");
    } else {
      audioRef.current
        .play()
        .catch((e) => console.error("Toggle play error", e));
      setIsPlaying(true);
      updateMediaSession(currentSongRef.current, "playing");
    }
  }, [
    audioCtxRef,
    audioRef,
    currentSongRef,
    playSongRef,
    setIsPlaying,
    updateMediaSession,
  ]);

  const seek = useCallback(
    (time: number) => {
      if (audioRef.current) {
        audioRef.current.currentTime = time;
        setCurrentTime(time);
        updatePositionState(audioRef.current);
      }
    },
    [audioRef, setCurrentTime, updatePositionState],
  );

  return {
    playSong,
    togglePlay,
    seek,
    prefetchSong,
  };
};
