"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  CreatePoiRequest,
  Folder,
  Poi,
  Search,
  UpdatePoiRequest,
} from "@cribsearch/shared-types";
import * as api from "./api";

interface StoreActions {
  addSearch: (search: Search) => void;
  deleteSearch: (id: string) => void;
  moveSearchToFolder: (searchId: string, folderId: string | undefined) => void;

  /** Creates a POI via the API and appends the server response to local state. */
  addPoi: (input: CreatePoiRequest) => Promise<Poi>;
  /** Updates a POI via the API and replaces the local record with the server response. */
  updatePoi: (id: string, input: UpdatePoiRequest) => Promise<Poi>;
  /** Deletes a POI via the API and removes it from local state. */
  deletePoi: (id: string) => Promise<void>;

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
  const [searches, setSearches] = useState<Search[]>([]);
  const [pois, setPois] = useState<Poi[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);

  // Hydrate POIs from the API on mount. On failure, log the error and keep an
  // empty list so the rest of the UI remains functional.
  useEffect(() => {
    api
      .listPois()
      .then((data) => setPois(data))
      .catch((err: unknown) => {
        console.error(
          "Failed to load POIs:",
          err instanceof Error ? err.message : err,
        );
      });
  }, []);

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

  const addPoi = useCallback(async (input: CreatePoiRequest): Promise<Poi> => {
    const poi = await api.createPoi(input);
    setPois((prev) => [...prev, poi]);
    return poi;
  }, []);

  const updatePoi = useCallback(
    async (id: string, input: UpdatePoiRequest): Promise<Poi> => {
      const poi = await api.updatePoi(id, input);
      setPois((prev) => prev.map((p) => (p.id === id ? poi : p)));
      return poi;
    },
    [],
  );

  const deletePoi = useCallback(async (id: string): Promise<void> => {
    await api.deletePoi(id);
    setPois((prev) => prev.filter((p) => p.id !== id));
  }, []);

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
