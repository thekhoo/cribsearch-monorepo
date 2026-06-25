"use client";

import type { Search } from "@cribsearch/shared-types";
import ResultsView from "./ResultsView";

interface CompareViewProps {
  searches: Search[];
  onClose: () => void;
}

export default function CompareView({ searches, onClose }: CompareViewProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Comparing {searches.length} Searches
        </h2>
        <button
          onClick={onClose}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back to History
        </button>
      </div>
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${searches.length}, minmax(0, 1fr))`,
        }}
      >
        {searches.map((search) => (
          <div
            key={search.id}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <h3 className="mb-1 truncate font-semibold">
              {search.nickname ?? search.address}
            </h3>
            <p className="mb-3 text-xs text-gray-500">
              {new Date(search.createdAt).toLocaleDateString()} ·{" "}
              {search.address}
            </p>
            <ResultsView search={search} />
          </div>
        ))}
      </div>
    </div>
  );
}
