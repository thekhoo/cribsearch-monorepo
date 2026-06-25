"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Folder, Poi, Search } from "@cribsearch/shared-types";
import { SEED_FOLDERS, SEED_POIS, SEED_SEARCHES } from "./fixtures";

interface StoreActions {
  addSearch: (search: Search) => void;
  deleteSearch: (id: string) => void;
  moveSearchToFolder: (searchId: string, folderId: string | undefined) => void;

  addPoi: (poi: Poi) => void;
  updatePoi: (id: string, updates: Partial<Omit<Poi, "id">>) => void;
  deletePoi: (id: string) => void;

  addFolder: (folder: Folder) => void;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;
}

interface StoreState {
  searches: Search[];
  pois: Poi[];
  folders: Folder[];
}

type Store = StoreState & StoreActions;

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [searches, setSearches] = useState<Search[]>(SEED_SEARCHES);
  const [pois, setPois] = useState<Poi[]>(SEED_POIS);
  const [folders, setFolders] = useState<Folder[]>(SEED_FOLDERS);

  const addSearch = useCallback(
    (search: Search) => setSearches((prev) => [search, ...prev]),
    [],
  );
  const deleteSearch = useCallback(
    (id: string) => setSearches((prev) => prev.filter((s) => s.id !== id)),
    [],
  );
  const moveSearchToFolder = useCallback(
    (searchId: string, folderId: string | undefined) =>
      setSearches((prev) =>
        prev.map((s) => (s.id === searchId ? { ...s, folderId } : s)),
      ),
    [],
  );

  const addPoi = useCallback(
    (poi: Poi) => setPois((prev) => [...prev, poi]),
    [],
  );
  const updatePoi = useCallback(
    (id: string, updates: Partial<Omit<Poi, "id">>) =>
      setPois((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      ),
    [],
  );
  const deletePoi = useCallback(
    (id: string) => setPois((prev) => prev.filter((p) => p.id !== id)),
    [],
  );

  const addFolder = useCallback(
    (folder: Folder) => setFolders((prev) => [...prev, folder]),
    [],
  );
  const renameFolder = useCallback(
    (id: string, name: string) =>
      setFolders((prev) =>
        prev.map((f) => (f.id === id ? { ...f, name } : f)),
      ),
    [],
  );
  const deleteFolder = useCallback(
    (id: string) => {
      setFolders((prev) => prev.filter((f) => f.id !== id));
      setSearches((prev) =>
        prev.map((s) =>
          s.folderId === id ? { ...s, folderId: undefined } : s,
        ),
      );
    },
    [],
  );

  const value = useMemo<Store>(
    () => ({
      searches,
      pois,
      folders,
      addSearch,
      deleteSearch,
      moveSearchToFolder,
      addPoi,
      updatePoi,
      deletePoi,
      addFolder,
      renameFolder,
      deleteFolder,
    }),
    [
      searches,
      pois,
      folders,
      addSearch,
      deleteSearch,
      moveSearchToFolder,
      addPoi,
      updatePoi,
      deletePoi,
      addFolder,
      renameFolder,
      deleteFolder,
    ],
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
