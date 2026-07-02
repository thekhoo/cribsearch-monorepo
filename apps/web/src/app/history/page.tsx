"use client";

import { useEffect, useMemo, useState } from "react";
import type { Search } from "@cribsearch/shared-types";
import { useStore } from "../../lib/store";
import { getSearch } from "../../lib/api";
import FolderSidebar from "../../components/FolderSidebar";
import HistoryList from "../../components/HistoryList";
import CompareView from "../../components/CompareView";
import EmptyState from "../../components/EmptyState";
import Spinner from "../../components/Spinner";

const MAX_COMPARE = 3;

export default function HistoryPage() {
  const { searches } = useStore();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [comparing, setComparing] = useState(false);
  const [compareData, setCompareData] = useState<Search[] | null>(null);
  const [compareError, setCompareError] = useState<string | null>(null);

  const filteredSearches = useMemo(() => {
    if (activeFolderId === null) return searches;
    if (activeFolderId === "__uncategorised__") {
      return searches.filter((s) => !s.folderId);
    }
    return searches.filter((s) => s.folderId === activeFolderId);
  }, [searches, activeFolderId]);

  // Summaries don't carry the full result, so fetch each selected Search's
  // detail on demand when the user enters compare mode.
  useEffect(() => {
    if (!comparing) {
      setCompareData(null);
      setCompareError(null);
      return;
    }
    let cancelled = false;
    setCompareData(null);
    setCompareError(null);
    Promise.all(selectedIds.map((id) => getSearch(id)))
      .then((responses) => {
        if (cancelled) return;
        const full = responses
          .map((r) => r.search)
          .filter((s): s is Search => s != null);
        setCompareData(full);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setCompareError(
            err instanceof Error ? err.message : "Failed to load Searches",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [comparing, selectedIds]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  }

  if (searches.length === 0) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="mb-6 text-3xl font-bold tracking-tight">History</h1>
        <EmptyState message="No Searches yet. Run a Search to see it here." />
      </main>
    );
  }

  if (comparing && selectedIds.length >= 2) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12">
        {compareError && (
          <p className="mb-4 text-sm text-red-600">{compareError}</p>
        )}
        {compareData === null && !compareError ? (
          <Spinner />
        ) : (
          <CompareView
            searches={compareData ?? []}
            onClose={() => setComparing(false)}
          />
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">History</h1>
        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && (
            <span className="text-sm text-gray-500">
              {selectedIds.length} selected
            </span>
          )}
          {selectedIds.length >= 2 && (
            <button
              onClick={() => setComparing(true)}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Compare
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-6">
        <FolderSidebar
          activeFolderId={activeFolderId}
          onSelect={setActiveFolderId}
        />
        <div className="min-w-0 flex-1">
          <HistoryList
            filteredSearches={filteredSearches}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            maxCompare={MAX_COMPARE}
          />
        </div>
      </div>
    </main>
  );
}
