import { useEffect, useRef, useState } from "react";
import { AudioQuality } from "../../types";

const getLocal = <T,>(key: string, def: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : def;
  } catch {
    return def;
  }
};

export interface UseAudioSettingsResult {
  audioQuality: AudioQuality;
  setAudioQuality: React.Dispatch<React.SetStateAction<AudioQuality>>;
  audioQualityRef: React.MutableRefObject<AudioQuality>;
  volume: number;
  setVolume: React.Dispatch<React.SetStateAction<number>>;
  volumeRef: React.MutableRefObject<number>;
}

export const useAudioSettings = (
  qualityKey: string = "tunefree_quality",
  volumeKey: string = "tunefree_volume",
): UseAudioSettingsResult => {
  const [audioQuality, setAudioQuality] = useState<AudioQuality>(() =>
    getLocal(qualityKey, "320k"),
  );
  const [volume, setVolume] = useState<number>(() => getLocal(volumeKey, 1));

  const audioQualityRef = useRef<AudioQuality>(audioQuality);
  const volumeRef = useRef<number>(volume);

  useEffect(() => {
    localStorage.setItem(qualityKey, JSON.stringify(audioQuality));
    audioQualityRef.current = audioQuality;
  }, [audioQuality, qualityKey]);

  useEffect(() => {
    localStorage.setItem(volumeKey, JSON.stringify(volume));
    volumeRef.current = volume;
  }, [volume, volumeKey]);

  return {
    audioQuality,
    setAudioQuality,
    audioQualityRef,
    volume,
    setVolume,
    volumeRef,
  };
};
