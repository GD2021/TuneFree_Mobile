import React, { useEffect, useRef, useState, memo } from "react";
import { getLyrics, getImgReferrerPolicy } from "../../services/api";
import { ParsedLyric } from "../../types";
import {
  usePlayerActions,
  usePlayerState,
  usePlayerTime,
} from "../../contexts/PlayerContext";
import { MusicIcon } from "../Icons";
import { motion } from "framer-motion";

interface FullPlayerMainPanelProps {
  isOpen: boolean;
  showLyrics: boolean;
  setShowLyrics: (show: boolean) => void;
}

const parseLrc = (lrc: string): ParsedLyric[] => {
  if (!lrc) return [];
  const lines = lrc.split("\n");
  const raw: { time: number; text: string }[] = [];
  const timeExp = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

  for (const line of lines) {
    const match = timeExp.exec(line);
    if (match) {
      const min = parseInt(match[1]);
      const sec = parseInt(match[2]);
      const msStr = match[3];
      const msVal = parseInt(msStr);
      const ms = msStr.length === 2 ? msVal * 10 : msVal;

      const time = min * 60 + sec + ms / 1000;
      const text = line.replace(timeExp, "").trim();

      if (text) raw.push({ time, text });
    }
  }

  raw.sort((a, b) => a.time - b.time);

  const result: ParsedLyric[] = [];
  for (const item of raw) {
    const last = result[result.length - 1];
    if (last && Math.abs(last.time - item.time) < 0.2) {
      if (!last.translation) last.translation = item.text;
    } else {
      result.push({ time: item.time, text: item.text });
    }
  }

  return result;
};

const findActiveLyricIndex = (
  lyrics: ParsedLyric[],
  currentTime: number,
): number => {
  if (lyrics.length === 0) return 0;
  let lo = 0,
    hi = lyrics.length - 1,
    result = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (lyrics[mid].time <= currentTime) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
};

const FullPlayerMainPanel: React.FC<FullPlayerMainPanelProps> = ({
  isOpen,
  showLyrics,
  setShowLyrics,
}) => {
  const { currentSong, isPlaying } = usePlayerState();
  const { seek } = usePlayerActions();
  const { currentTime } = usePlayerTime();

  const [lyrics, setLyrics] = useState<ParsedLyric[]>([]);
  const [activeLyricIndex, setActiveLyricIndex] = useState(0);
  const [imgError, setImgError] = useState(false);

  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const lyricsCacheRef = useRef<Map<string, ParsedLyric[]>>(new Map());
  const lyricsRequestIdRef = useRef(0);

  const hasSong = !!currentSong;

  useEffect(() => {
    if (isOpen && currentSong) {
      setLyrics([]);
      setActiveLyricIndex(0);
      setImgError(false);

      const cacheKey = `${currentSong.source}:${currentSong.id}:${currentSong.lrc || ""}`;
      const cached = lyricsCacheRef.current.get(cacheKey);
      if (cached) {
        setLyrics(cached.length > 0 ? cached : [{ time: 0, text: "暂无歌词" }]);
        return;
      }

      if (currentSong.lrc) {
        const parsed = parseLrc(currentSong.lrc);
        lyricsCacheRef.current.set(cacheKey, parsed);
        setLyrics(parsed.length > 0 ? parsed : [{ time: 0, text: "暂无歌词" }]);
      } else {
        const requestId = ++lyricsRequestIdRef.current;
        getLyrics(currentSong.id, currentSong.source).then((rawLrc) => {
          if (requestId !== lyricsRequestIdRef.current) return;
          if (rawLrc) {
            const parsed = parseLrc(rawLrc);
            lyricsCacheRef.current.set(cacheKey, parsed);
            setLyrics(
              parsed.length > 0 ? parsed : [{ time: 0, text: "暂无歌词" }],
            );
          } else {
            lyricsCacheRef.current.set(cacheKey, []);
            setLyrics([{ time: 0, text: "暂无歌词" }]);
          }
        });
      }
    }
  }, [currentSong, isOpen]);

  useEffect(() => {
    if (lyrics.length === 0) return;
    const index = findActiveLyricIndex(lyrics, currentTime);
    setActiveLyricIndex((prev) => (prev !== index ? index : prev));
  }, [currentTime, lyrics]);

  useEffect(() => {
    if (showLyrics && lyricsContainerRef.current && lyrics.length > 0) {
      const activeEl = lyricsContainerRef.current.children[
        activeLyricIndex
      ] as HTMLElement;
      if (activeEl) {
        const container = lyricsContainerRef.current;
        const scrollNew =
          activeEl.offsetTop -
          container.clientHeight / 2 +
          activeEl.clientHeight / 2;
        container.scrollTo({ top: scrollNew, behavior: "smooth" });
      }
    }
  }, [activeLyricIndex, showLyrics, lyrics]);

  return (
    <div className="relative flex-1 w-full">
      {/* Cover View */}
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center px-8"
        animate={{
          opacity: showLyrics ? 0 : 1,
          scale: showLyrics ? 0.95 : 1,
        }}
        style={{ pointerEvents: showLyrics ? "none" : "auto" }}
        onClick={() => hasSong && setShowLyrics(true)}
      >
        <div className="w-full max-w-[350px] bg-gray-100 shadow-[0_25px_60px_-12px_rgba(0,0,0,0.15)] rounded-2xl overflow-hidden">
          {hasSong && currentSong?.pic && !imgError ? (
            <motion.img
              src={currentSong.pic}
              alt="Album"
              referrerPolicy={getImgReferrerPolicy(currentSong.pic)}
              loading="lazy"
              decoding="async"
              className="w-full h-auto block"
              animate={{ scale: isPlaying ? 1 : 0.95 }}
              transition={{ duration: 0.7, ease: "easeInOut" }}
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MusicIcon size={64} className="text-gray-300" />
            </div>
          )}
        </div>
      </motion.div>

      {/* Lyrics View */}
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center z-20"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{
          opacity: showLyrics ? 1 : 0,
          scale: showLyrics ? 1 : 0.95,
        }}
        style={{ pointerEvents: showLyrics ? "auto" : "none" }}
      >
        <div
          className="absolute inset-0"
          onClick={() => setShowLyrics(false)}
        />

        <div
          ref={lyricsContainerRef}
          className="w-full h-full overflow-y-auto no-scrollbar relative px-8 py-[40vh] text-center"
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            maskImage:
              "linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)",
          }}
        >
          {lyrics.length > 0 ? (
            lyrics.map((line, i) => (
              <div
                key={i}
                className={`py-4 transition-all duration-500 cursor-pointer flex flex-col items-center ${
                  i === activeLyricIndex
                    ? "opacity-100 scale-105"
                    : "opacity-40 scale-100 hover:opacity-70"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  seek(line.time);
                }}
              >
                <p
                  className={`text-xl font-bold leading-relaxed ${
                    i === activeLyricIndex
                      ? "text-gray-900"
                      : "text-gray-500/80"
                  }`}
                >
                  {line.text}
                </p>
                {line.translation && (
                  <p
                    className={`text-base font-medium mt-1 leading-normal ${
                      i === activeLyricIndex
                        ? "text-gray-700"
                        : "text-gray-500/60"
                    }`}
                  >
                    {line.translation}
                  </p>
                )}
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full absolute inset-0">
              {hasSong ? (
                <>
                  <div className="w-6 h-6 border-2 border-gray-300 border-t-transparent rounded-full animate-spin mb-2"></div>
                  <p className="text-gray-400 text-sm">加载歌词中...</p>
                </>
              ) : (
                <p className="text-gray-400 text-sm">暂无播放</p>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default memo(FullPlayerMainPanel);
