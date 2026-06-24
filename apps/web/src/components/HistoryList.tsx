"use client";

import { useState } from "react";
import type { Search } from "@homefinder/shared-types";
import { useStore } from "../lib/store";
import ResultsView from "./ResultsView";
import EmptyState from "./EmptyState";

interface HistoryListProps {
  filteredSearches: Search[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  maxCompare: number;
}

export default function HistoryList({
  filteredSearches,
  selectedIds,
  onToggleSelect,
  maxCompare,
}: HistoryListProps) {
  const { deleteSearch, folders } = useStore();
  const [openSearchId, setOpenSearchId] = useState<string | null>(null);

  const openSearch = filteredSearches.find((s) => s.id === openSearchId);

  if (filteredSearches.length === 0) {
    return <EmptyState message="No Searches to show." />;
  }

  if (openSearch) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setOpenSearchId(null)}
          className="text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          &larr; Back to History
        </button>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-xl font-semibold">
            {openSearch.nickname ?? openSearch.address}
          </h2>
          <p className="mb-4 text-sm text-gray-500">
            {new Date(openSearch.createdAt).toLocaleDateString()} ·{" "}
            {openSearch.address}
          </p>
          <ResultsView search={openSearch} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {filteredSearches.map((search) => {
        const isSelected = selectedIds.includes(search.id);
        const canSelect = isSelected || selectedIds.length < maxCompare;
        const folder = search.folderId
          ? folders.find((f) => f.id === search.folderId)
          : undefined;

        return (
          <div
            key={search.id}
            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
          >
            <input
              type="checkbox"
              checked={isSelected}
              disabled={!canSelect}
              onChange={() => onToggleSelect(search.id)}
              className="h-4 w-4 rounded border-gray-300 accent-gray-900"
              title={
                canSelect
                  ? "Select for comparison"
                  : `Max ${maxCompare} Searches for compare`
              }
            />
            <button
              onClick={() => setOpenSearchId(search.id)}
              className="min-w-0 flex-1 text-left"
            >
              <p className="truncate font-medium text-gray-900">
                {search.nickname ?? search.address}
              </p>
              <p className="text-sm text-gray-500">
                {new Date(search.createdAt).toLocaleDateString()} ·{" "}
                {search.modes.length} mode
                {search.modes.length !== 1 && "s"} ·{" "}
                {search.amenityCategories.length} categor
                {search.amenityCategories.length === 1 ? "y" : "ies"}
                {search.pois.length > 0 &&
                  ` · ${search.pois.length} POI${search.pois.length !== 1 ? "s" : ""}`}
              </p>
            </button>
            {folder && (
              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                {folder.name}
              </span>
            )}
            <button
              onClick={() => deleteSearch(search.id)}
              className="shrink-0 text-sm text-red-500 hover:text-red-700"
              title="Delete Search"
            >
              Delete
            </button>
          </div>
        );
      })}
    </div>
  );
}
