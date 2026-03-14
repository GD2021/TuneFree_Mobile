import React from "react";
import { usePlayerState } from "../../contexts/PlayerContext";
import { useLibraryData } from "../../contexts/LibraryContext";
import { DownloadIcon, HeartIcon, HeartFillIcon } from "../Icons";

interface FullPlayerInfoBarProps {
  onShowDownload: () => void;
  onPointerDown?: React.PointerEventHandler<HTMLDivElement>;
}

const FullPlayerInfoBar: React.FC<FullPlayerInfoBarProps> = ({
  onShowDownload,
  onPointerDown,
}) => {
  const { currentSong } = usePlayerState();
  const { isFavorite, toggleFavorite } = useLibraryData();
  const hasSong = !!currentSong;

  return (
    <div
      className="relative z-30 px-8 mt-4 mb-2 min-h-[80px] flex items-center justify-between pointer-events-auto"
      onPointerDown={onPointerDown}
    >
      <div className="flex-1 min-w-0 pr-4">
        <h2 className="text-2xl font-bold truncate text-black leading-tight">
          {hasSong ? currentSong.name : "未播放"}
        </h2>
        <div className="flex items-center space-x-2 mt-1">
          {hasSong && (
            <span className="text-[10px] font-bold text-white bg-gray-400 px-1.5 py-0.5 rounded uppercase">
              {currentSong.source}
            </span>
          )}
          <p className="text-lg text-ios-red/90 font-medium truncate cursor-pointer hover:underline">
            {hasSong ? currentSong.artist : "选择歌曲播放"}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (hasSong) onShowDownload();
          }}
          className={`p-3 -m-1 rounded-full active:scale-90 transition-transform ${hasSong ? "text-gray-500 hover:text-black" : "text-gray-300"}`}
          disabled={!hasSong}
        >
          <DownloadIcon size={24} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (hasSong && currentSong) toggleFavorite(currentSong);
          }}
          className={`p-3 -m-1 rounded-full active:scale-90 transition-transform ${!hasSong ? "opacity-50" : ""}`}
          disabled={!hasSong}
        >
          {hasSong && currentSong && isFavorite(currentSong.id) ? (
            <HeartFillIcon className="text-ios-red" size={26} />
          ) : (
            <HeartIcon className="text-gray-400" size={26} />
          )}
        </button>
      </div>
    </div>
  );
};

export default FullPlayerInfoBar;
