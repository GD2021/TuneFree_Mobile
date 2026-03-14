import React, { useState } from "react";
import { usePlayerState } from "../contexts/PlayerContext";
import { ChevronDownIcon, MoreIcon } from "./Icons";
import QueuePopup from "./QueuePopup";
import DownloadPopup from "./DownloadPopup";
import PlayerMorePopup from "./PlayerMorePopup";
import FullPlayerMainPanel from "./player/FullPlayerMainPanel";
import FullPlayerInfoBar from "./player/FullPlayerInfoBar";
import FullPlayerControls from "./player/FullPlayerControls";
import { motion, PanInfo } from "framer-motion";

interface FullPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  layoutId?: string;
}

const FullPlayer: React.FC<FullPlayerProps> = ({
  isOpen,
  onClose,
  layoutId,
}) => {
  const { currentSong } = usePlayerState();
  const [showLyrics, setShowLyrics] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const hasSong = !!currentSong;

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.y > 150 || info.velocity.y > 300) {
      onClose();
    }
  };

  return (
    <motion.div
      layoutId={layoutId}
      className="fixed inset-0 z-50 flex flex-col bg-white overflow-hidden touch-none"
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 300, mass: 0.8 }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.05, bottom: 0.5 }}
      dragDirectionLock={true}
      onDragEnd={handleDragEnd}
      style={{ overscrollBehavior: "none" }}
    >
      <motion.div
        className="flex flex-col h-full w-full relative"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Ambient Background */}
        {hasSong && currentSong?.pic && (
          <div
            className="absolute inset-0 z-0 opacity-40 scale-150 blur-3xl transition-opacity duration-1000 pointer-events-none"
            style={{
              backgroundImage: `url(${currentSong.pic})`,
              backgroundPosition: "center",
              backgroundSize: "cover",
            }}
          />
        )}
        <div className="absolute inset-0 z-0 bg-white/60 backdrop-blur-3xl pointer-events-none" />

        {/* --- Header --- */}
        <div className="relative z-10 flex items-center justify-between px-6 pt-safe mt-4 pb-2">
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-black active:scale-90 transition"
          >
            <ChevronDownIcon size={30} />
          </button>
          <div className="w-10 h-1.5 bg-gray-300/80 rounded-full mx-auto absolute left-0 right-0 top-safe mt-4 pointer-events-none" />
          <button
            onClick={() => hasSong && setShowMore(true)}
            className={`p-2 transition active:scale-90 ${hasSong ? "text-gray-500 hover:text-black" : "text-gray-300"}`}
            disabled={!hasSong}
          >
            <MoreIcon size={24} />
          </button>
        </div>

        {/* --- Main Content --- */}
        <div className="relative z-10 flex-1 w-full overflow-hidden flex flex-col">
          <FullPlayerMainPanel
            isOpen={isOpen}
            showLyrics={showLyrics}
            setShowLyrics={setShowLyrics}
          />

          <FullPlayerInfoBar
            onShowDownload={() => setShowDownload(true)}
            onPointerDown={(e) => e.stopPropagation()}
          />
        </div>

        {/* --- Footer Controls --- */}
        <FullPlayerControls onOpenQueue={() => setShowQueue(true)} />

        <QueuePopup isOpen={showQueue} onClose={() => setShowQueue(false)} />
        {hasSong && currentSong && (
          <DownloadPopup
            isOpen={showDownload}
            onClose={() => setShowDownload(false)}
            song={currentSong}
          />
        )}
        <PlayerMorePopup
          isOpen={showMore}
          onClose={() => setShowMore(false)}
          onClosePlayer={onClose}
        />
      </motion.div>
    </motion.div>
  );
};

export default FullPlayer;
