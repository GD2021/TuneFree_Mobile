import { useCallback, useRef } from "react";
import { Song, AudioQuality } from "../../types";
import { parseSongFull } from "../../services/api";

export type ParsedCacheEntry = {
  url: string | null;
  lrc: string;
  pic: string;
  ts: number;
};

export type ParsedResult = {
  url: string | null;
  lrc: string;
  pic: string;
};

export type UseParsedCacheResult = {
  getParsedCacheKey: (id: string | number, source: string, quality: string) => string;
  getCachedParsed: (key: string) => ParsedCacheEntry | null;
  setCachedParsed: (key: string, data: ParsedResult) => void;
  prefetchParsed: (song: Song, quality: AudioQuality) => Promise<void>;
};

export const useParsedCache = (
  ttlMs: number = 4 * 60 * 1000,
): UseParsedCacheResult => {
  const parsedCacheRef = useRef<Map<string, ParsedCacheEntry>>(new Map());
  const inflightParsedRef = useRef<Map<string, Promise<ParsedCacheEntry | null>>>(
    new Map(),
  );

  const getParsedCacheKey = useCallback(
    (id: string | number, source: string, quality: string) =>
      `${source}:${id}:${quality}`,
    [],
  );

  const getCachedParsed = useCallback(
    (key: string) => {
      const cached = parsedCacheRef.current.get(key);
      if (!cached) return null;
      if (Date.now() - cached.ts > ttlMs) {
        parsedCacheRef.current.delete(key);
        return null;
      }
      return cached;
    },
    [ttlMs],
  );

  const setCachedParsed = useCallback((key: string, data: ParsedResult) => {
    parsedCacheRef.current.set(key, { ...data, ts: Date.now() });
  }, []);

  const prefetchParsed = useCallback(
    async (song: Song, quality: AudioQuality) => {
      if (!song) return;
      const key = getParsedCacheKey(song.id, song.source, quality);
      if (getCachedParsed(key)) return;
      if (inflightParsedRef.current.has(key)) return;

      const task = parseSongFull(song.id, song.source, quality)
        .then((result) => {
          inflightParsedRef.current.delete(key);
          if (result) {
            setCachedParsed(key, result);
            return { ...result, ts: Date.now() };
          }
          return null;
        })
        .catch(() => {
          inflightParsedRef.current.delete(key);
          return null;
        });

      inflightParsedRef.current.set(key, task);
      await task;
    },
    [getParsedCacheKey, getCachedParsed, setCachedParsed],
  );

  return {
    getParsedCacheKey,
    getCachedParsed,
    setCachedParsed,
    prefetchParsed,
  };
};
