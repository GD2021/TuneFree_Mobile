import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Song, Playlist } from "../types";
import { DEFAULT_API_BASE } from "../services/api";

interface LibraryDataContextType {
  favorites: Song[];
  playlists: Playlist[];
  toggleFavorite: (song: Song) => void;
  isFavorite: (songId: number | string) => boolean;
  createPlaylist: (name: string, initialSongs?: Song[]) => void;
  importPlaylist: (name: string, songs: Song[]) => void;
  renamePlaylist: (id: string, name: string) => void;
  deletePlaylist: (id: string) => void;
  addToPlaylist: (playlistId: string, song: Song) => void;
  removeFromPlaylist: (playlistId: string, songId: number | string) => void;
  exportData: () => void;
  importData: (jsonData: string) => boolean;
}

interface LibrarySettingsContextType {
  apiKey: string;
  corsProxy: string;
  apiBase: string;
  setApiKey: (key: string) => void;
  setCorsProxy: (url: string) => void;
  setApiBase: (url: string) => void;
}

export interface LibraryContextType
  extends LibraryDataContextType, LibrarySettingsContextType {}

const DEFAULT_PROXY = "";

const LIBRARY_DATA_DEFAULTS: LibraryDataContextType = {
  favorites: [],
  playlists: [],
  toggleFavorite: () => {},
  isFavorite: () => false,
  createPlaylist: () => {},
  importPlaylist: () => {},
  renamePlaylist: () => {},
  deletePlaylist: () => {},
  addToPlaylist: () => {},
  removeFromPlaylist: () => {},
  exportData: () => {},
  importData: () => false,
};

const LIBRARY_SETTINGS_DEFAULTS: LibrarySettingsContextType = {
  apiKey: "",
  corsProxy: "",
  apiBase: DEFAULT_API_BASE,
  setApiKey: () => {},
  setCorsProxy: () => {},
  setApiBase: () => {},
};

const LibraryDataContext = createContext<LibraryDataContextType>(
  LIBRARY_DATA_DEFAULTS,
);
const LibrarySettingsContext = createContext<LibrarySettingsContextType>(
  LIBRARY_SETTINGS_DEFAULTS,
);

export const LibraryProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [favorites, setFavorites] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [apiKey, setApiKeyInternal] = useState<string>(
    () => localStorage.getItem("tunefree_api_key") || "",
  );
  const [corsProxy, setCorsProxyInternal] = useState<string>(
    () => localStorage.getItem("tunefree_cors_proxy") || DEFAULT_PROXY,
  );
  const [apiBase, setApiBaseInternal] = useState<string>(
    () => localStorage.getItem("tunefree_api_base") || DEFAULT_API_BASE,
  );

  const favoritesRef = useRef(favorites);
  const playlistsRef = useRef(playlists);

  useEffect(() => {
    favoritesRef.current = favorites;
  }, [favorites]);

  useEffect(() => {
    playlistsRef.current = playlists;
  }, [playlists]);

  useEffect(() => {
    try {
      const storedFavs = localStorage.getItem("tunefree_favorites");
      const storedPlaylists = localStorage.getItem("tunefree_playlists");
      if (storedFavs) setFavorites(JSON.parse(storedFavs));
      if (storedPlaylists) setPlaylists(JSON.parse(storedPlaylists));
    } catch {
      // ignore corrupted data
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("tunefree_favorites", JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem("tunefree_playlists", JSON.stringify(playlists));
  }, [playlists]);

  const setApiKey = useCallback((key: string) => {
    setApiKeyInternal(key);
    localStorage.setItem("tunefree_api_key", key);
  }, []);

  const setCorsProxy = useCallback((url: string) => {
    setCorsProxyInternal(url);
    localStorage.setItem("tunefree_cors_proxy", url);
  }, []);

  const setApiBase = useCallback((url: string) => {
    const cleanUrl = url.endsWith("/") ? url.slice(0, -1) : url;
    setApiBaseInternal(cleanUrl);
    localStorage.setItem("tunefree_api_base", cleanUrl);
  }, []);

  const toggleFavorite = useCallback((song: Song) => {
    setFavorites((prev) => {
      if (prev.find((s) => String(s.id) === String(song.id))) {
        return prev.filter((s) => String(s.id) !== String(song.id));
      }
      return [song, ...prev];
    });
  }, []);

  const isFavorite = useCallback(
    (songId: number | string) =>
      favorites.some((s) => String(s.id) === String(songId)),
    [favorites],
  );

  const createPlaylist = useCallback(
    (name: string, initialSongs: Song[] = []) => {
      const newPlaylist: Playlist = {
        id: Date.now().toString(),
        name: String(name),
        createTime: Date.now(),
        songs: initialSongs,
      };
      setPlaylists((prev) => [newPlaylist, ...prev]);
    },
    [],
  );

  const importPlaylist = useCallback((name: string, songs: Song[]) => {
    const newPlaylist: Playlist = {
      id: Date.now().toString(),
      name: String(name),
      createTime: Date.now(),
      songs,
    };
    setPlaylists((prev) => [newPlaylist, ...prev]);
  }, []);

  const renamePlaylist = useCallback((id: string, name: string) => {
    setPlaylists((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name: String(name) } : p)),
    );
  }, []);

  const deletePlaylist = useCallback((id: string) => {
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const addToPlaylist = useCallback((playlistId: string, song: Song) => {
    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.id !== playlistId) return p;
        if (p.songs.find((s) => String(s.id) === String(song.id))) return p;
        return { ...p, songs: [...p.songs, song] };
      }),
    );
  }, []);

  const removeFromPlaylist = useCallback(
    (playlistId: string, songId: number | string) => {
      setPlaylists((prev) =>
        prev.map((p) => {
          if (p.id !== playlistId) return p;
          return {
            ...p,
            songs: p.songs.filter((s) => String(s.id) !== String(songId)),
          };
        }),
      );
    },
    [],
  );

  const exportData = useCallback(() => {
    const data = {
      version: 4,
      favorites: favoritesRef.current,
      playlists: playlistsRef.current,
      exportDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tunefree_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const importData = useCallback((jsonData: string): boolean => {
    try {
      const data = JSON.parse(jsonData);
      if (data.favorites) setFavorites(data.favorites);
      if (data.playlists) setPlaylists(data.playlists);
      return true;
    } catch {
      return false;
    }
  }, []);

  const dataValue = useMemo<LibraryDataContextType>(
    () => ({
      favorites,
      playlists,
      toggleFavorite,
      isFavorite,
      createPlaylist,
      importPlaylist,
      renamePlaylist,
      deletePlaylist,
      addToPlaylist,
      removeFromPlaylist,
      exportData,
      importData,
    }),
    [
      favorites,
      playlists,
      toggleFavorite,
      isFavorite,
      createPlaylist,
      importPlaylist,
      renamePlaylist,
      deletePlaylist,
      addToPlaylist,
      removeFromPlaylist,
      exportData,
      importData,
    ],
  );

  const settingsValue = useMemo<LibrarySettingsContextType>(
    () => ({
      apiKey,
      corsProxy,
      apiBase,
      setApiKey,
      setCorsProxy,
      setApiBase,
    }),
    [apiKey, corsProxy, apiBase, setApiKey, setCorsProxy, setApiBase],
  );

  return (
    <LibrarySettingsContext.Provider value={settingsValue}>
      <LibraryDataContext.Provider value={dataValue}>
        {children}
      </LibraryDataContext.Provider>
    </LibrarySettingsContext.Provider>
  );
};

export const useLibraryData = () => useContext(LibraryDataContext);
export const useLibrarySettings = () => useContext(LibrarySettingsContext);

export const useLibrary = (): LibraryContextType => {
  const data = useLibraryData();
  const settings = useLibrarySettings();
  return {
    ...data,
    ...settings,
  };
};
