"use client";

import { useEffect, useState } from "react";
import type { SearchResponse, SearchSummary } from "@cribsearch/shared-types";
import { useStore } from "../lib/store";
import { getSearch } from "../lib/api";
import { formatPrice, STATUS_META } from "../lib/format";
import ResultsView from "./ResultsView";
import EmptyState from "./EmptyState";
import PropertyDetailsPanel from "./PropertyDetailsPanel";
import Spinner from "./Spinner";

interface HistoryListProps {
  filteredSearches: SearchSummary[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  maxCompare: number;
}

/** A search can only be opened for results / compared once it has a result. */
function hasResult(summary: SearchSummary): boolean {
  return summary.status === "Complete" || summary.status === "PartialFailure";
}

export default function HistoryList({
  filteredSearches,
  selectedIds,
  onToggleSelect,
  maxCompare,
}: HistoryListProps) {
  const { deleteSearch, moveSearchToFolder, folders } = useStore();
  const [openSearchId, setOpenSearchId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SearchResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const openSummary = filteredSearches.find((s) => s.id === openSearchId);

  // Load full search detail (amenity groups + POIs) on demand when one is opened.
  useEffect(() => {
    if (openSearchId === null) {
      setDetail(null);
      setDetailError(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    setDetail(null);
    getSearch(openSearchId)
      .then((res) => {
        if (!cancelled) setDetail(res);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setDetailError(
            err instanceof Error ? err.message : "Failed to load search",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [openSearchId]);

  if (filteredSearches.length === 0) {
    return <EmptyState message="No Searches to show." />;
  }

  if (openSummary) {
    const status = STATUS_META[openSummary.status];
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
            {openSummary.searchName ?? openSummary.address}
          </h2>
          <p className="mb-4 text-sm text-gray-500">
            {new Date(openSummary.createdAt).toLocaleDateString()} ·{" "}
            {openSummary.address}
          </p>
          {detailLoading && <Spinner />}
          {detailError && <p className="text-sm text-red-600">{detailError}</p>}
          {!detailLoading &&
            !detailError &&
            detail &&
            (detail.search ? (
              <div className="animate-fade-in space-y-4">
                <PropertyDetailsPanel
                  search={detail.search}
                  onUpdated={(s) =>
                    setDetail((prev) => (prev ? { ...prev, search: s } : prev))
                  }
                />
                <ResultsView search={detail.search} />
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                {detail.status === "Failed"
                  ? `This search failed${detail.error ? `: ${detail.error}` : "."}`
                  : `This search is ${status.label.toLowerCase()} — no results yet.`}
              </p>
            ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {filteredSearches.map((search) => {
        const isSelected = selectedIds.includes(search.id);
        const selectable = hasResult(search);
        const canSelect =
          selectable && (isSelected || selectedIds.length < maxCompare);
        const status = STATUS_META[search.status];
        const priceLabel = formatPrice(search.price);
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
                !selectable
                  ? "Only completed Searches can be compared"
                  : canSelect
                    ? "Select for comparison"
                    : `Max ${maxCompare} Searches for compare`
              }
            />
            <button
              onClick={() => setOpenSearchId(search.id)}
              className="min-w-0 flex-1 text-left"
            >
              <p className="truncate font-medium text-gray-900">
                {search.searchName ?? search.address}
              </p>
              <p className="truncate text-sm text-gray-500">
                {new Date(search.createdAt).toLocaleDateString()} ·{" "}
                {search.address}
              </p>
            </button>
            {priceLabel && (
              <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                {priceLabel}
              </span>
            )}
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${status.badgeClass}`}
            >
              {status.label}
            </span>
            <select
              value={search.folderId ?? ""}
              onChange={(e) =>
                moveSearchToFolder(search.id, e.target.value || undefined)
              }
              className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600"
            >
              <option value="">No folder</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
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
