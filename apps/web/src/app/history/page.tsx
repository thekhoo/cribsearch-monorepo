"use client";

import { useMemo, useState } from "react";
import { useStore } from "../../lib/store";
import HistoryList from "../../components/HistoryList";
import EmptyState from "../../components/EmptyState";

const MAX_COMPARE = 3;

export default function HistoryPage() {
  const { searches } = useStore();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  const filteredSearches = useMemo(() => {
    if (activeFolderId === null) return searches;
    if (activeFolderId === "__uncategorised__") {
      return searches.filter((s) => !s.folderId);
    }
    return searches.filter((s) => s.folderId === activeFolderId);
  }, [searches, activeFolderId]);

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

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">History</h1>
        {selectedIds.length >= 2 && (
          <span className="text-sm text-gray-500">
            {selectedIds.length} selected for compare (task 6)
          </span>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveFolderId(null)}
          className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
            activeFolderId === null
              ? "border-gray-900 bg-gray-900 text-white"
              : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setActiveFolderId("__uncategorised__")}
          className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
            activeFolderId === "__uncategorised__"
              ? "border-gray-900 bg-gray-900 text-white"
              : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
          }`}
        >
          Uncategorised
        </button>
      </div>

      <HistoryList
        filteredSearches={filteredSearches}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        maxCompare={MAX_COMPARE}
      />
    </main>
  );
}
