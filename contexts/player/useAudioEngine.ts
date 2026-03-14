import { useCallback, useEffect, useRef, useState } from "react";

export interface AudioEngineHandlers {
  onTimeUpdate?: (audio: HTMLAudioElement) => void;
  onLoadedMetadata?: (audio: HTMLAudioElement) => void;
  onEnded?: (audio: HTMLAudioElement) => void;
  onError?: (audio: HTMLAudioElement) => void;
  onWaiting?: (audio: HTMLAudioElement) => void;
  onCanPlay?: (audio: HTMLAudioElement) => void;
}

export interface UseAudioEngineOptions {
  handlers?: AudioEngineHandlers;
}

export interface UseAudioEngineResult {
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
  audioCtxRef: React.MutableRefObject<AudioContext | null>;
  analyser: AnalyserNode | null;
  createAudioElement: (withCors: boolean) => HTMLAudioElement;
  initAudioContext: () => void;
  isIOS: boolean;
}

export const useAudioEngine = (
  options: UseAudioEngineOptions = {},
): UseAudioEngineResult => {
  const { handlers } = options;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxConnectedRef = useRef(false);

  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const handlersRef = useRef<AudioEngineHandlers | null>(null);
  const isIOSRef = useRef(
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
  );

  const detachHandlers = useCallback((audio: HTMLAudioElement) => {
    if (!handlersRef.current) return;
    const h = handlersRef.current;
    if (h.onTimeUpdate)
      audio.removeEventListener("timeupdate", h.onTimeUpdate as any);
    if (h.onLoadedMetadata)
      audio.removeEventListener("loadedmetadata", h.onLoadedMetadata as any);
    if (h.onEnded) audio.removeEventListener("ended", h.onEnded as any);
    if (h.onError) audio.removeEventListener("error", h.onError as any);
    if (h.onWaiting) audio.removeEventListener("waiting", h.onWaiting as any);
    if (h.onCanPlay) audio.removeEventListener("canplay", h.onCanPlay as any);
  }, []);

  const attachHandlers = useCallback(
    (audio: HTMLAudioElement, nextHandlers: AudioEngineHandlers) => {
      const wrapped: AudioEngineHandlers = {
        onTimeUpdate: nextHandlers.onTimeUpdate
          ? () => nextHandlers.onTimeUpdate?.(audio)
          : undefined,
        onLoadedMetadata: nextHandlers.onLoadedMetadata
          ? () => nextHandlers.onLoadedMetadata?.(audio)
          : undefined,
        onEnded: nextHandlers.onEnded
          ? () => nextHandlers.onEnded?.(audio)
          : undefined,
        onError: nextHandlers.onError
          ? () => nextHandlers.onError?.(audio)
          : undefined,
        onWaiting: nextHandlers.onWaiting
          ? () => nextHandlers.onWaiting?.(audio)
          : undefined,
        onCanPlay: nextHandlers.onCanPlay
          ? () => nextHandlers.onCanPlay?.(audio)
          : undefined,
      };

      if (wrapped.onTimeUpdate)
        audio.addEventListener("timeupdate", wrapped.onTimeUpdate as any);
      if (wrapped.onLoadedMetadata)
        audio.addEventListener(
          "loadedmetadata",
          wrapped.onLoadedMetadata as any,
        );
      if (wrapped.onEnded)
        audio.addEventListener("ended", wrapped.onEnded as any);
      if (wrapped.onError)
        audio.addEventListener("error", wrapped.onError as any);
      if (wrapped.onWaiting)
        audio.addEventListener("waiting", wrapped.onWaiting as any);
      if (wrapped.onCanPlay)
        audio.addEventListener("canplay", wrapped.onCanPlay as any);

      handlersRef.current = wrapped;
    },
    [],
  );

  const teardownAudioContext = useCallback(() => {
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
      sourceNodeRef.current = null;
      analyserRef.current = null;
      audioCtxConnectedRef.current = false;
      setAnalyser(null);
    }
  }, []);

  const createAudioElement = useCallback(
    (withCors: boolean) => {
      const oldAudio = audioRef.current;
      if (oldAudio) {
        oldAudio.pause();
        oldAudio.removeAttribute("src");
        detachHandlers(oldAudio);
      }

      teardownAudioContext();

      const audio = new Audio();
      audio.preload = "auto";
      (audio as any).playsInline = true;
      if (withCors) {
        audio.crossOrigin = "anonymous";
      }

      if (handlers) {
        attachHandlers(audio, handlers);
      }

      audioRef.current = audio;
      return audio;
    },
    [attachHandlers, detachHandlers, handlers, teardownAudioContext],
  );

  const initAudioContext = useCallback(() => {
    if (isIOSRef.current) return;
    if (audioCtxRef.current || !audioRef.current) return;

    try {
      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      const node = ctx.createAnalyser();
      node.fftSize = 512;
      node.smoothingTimeConstant = 0.7;

      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(node);
      node.connect(ctx.destination);

      audioCtxRef.current = ctx;
      sourceNodeRef.current = source;
      analyserRef.current = node;
      audioCtxConnectedRef.current = true;
      setAnalyser(node);
    } catch (e) {
      console.warn("AudioContext 初始化失败，使用模拟可视化", e);
    }
  }, []);

  useEffect(() => {
    if (!audioRef.current) {
      createAudioElement(false);
    }

    return () => {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        detachHandlers(audio);
      }
      teardownAudioContext();
    };
  }, [createAudioElement, detachHandlers, teardownAudioContext]);

  useEffect(() => {
    const handleVisibility = () => {
      const ctx = audioCtxRef.current;
      const source = sourceNodeRef.current;
      const node = analyserRef.current;

      if (document.visibilityState === "hidden") {
        if (ctx && source && node) {
          try {
            source.disconnect();
            node.disconnect();
          } catch {}
        }
      } else {
        if (ctx && ctx.state === "suspended") {
          ctx.resume();
        }
        if (ctx && source && node) {
          try {
            source.connect(node);
            node.connect(ctx.destination);
          } catch {}
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  return {
    audioRef,
    audioCtxRef,
    analyser,
    createAudioElement,
    initAudioContext,
    isIOS: isIOSRef.current,
  };
};
