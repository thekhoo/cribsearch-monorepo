"use client";

import { useState } from "react";
import type { AmenityCategory, Search, TransportMode } from "@cribsearch/shared-types";
import { useStore } from "../lib/store";
import { runSearch } from "../lib/api";
import ModeSelector from "./ModeSelector";
import AmenityCategorySelector from "./AmenityCategorySelector";
import PoiAttachList from "./PoiAttachList";
import Spinner from "./Spinner";
import ResultsView from "./ResultsView";

export default function SearchForm() {
  const { pois, addSearch } = useStore();

  const [address, setAddress] = useState("");
  const [modes, setModes] = useState<TransportMode[]>(["walk"]);
  const [categories, setCategories] = useState<AmenityCategory[]>([]);
  const [attachedPoiIds, setAttachedPoiIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Search | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const hasDestination = categories.length > 0 || attachedPoiIds.length > 0;
  const canSubmit = address.trim().length > 0 && modes.length >= 1 && hasDestination;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setResult(null);
    setError(null);
    setWarning(null);

    const attachedPois = pois.filter((p) => attachedPoiIds.includes(p.id));

    try {
      const { search: serverSearch, partialFailure } = await runSearch({
        address: address.trim(),
        modes,
        amenityCategories: categories,
        attachedPois,
      });

      // Merge: use the server's id, createdAt, amenityGroups and pois, but
      // guarantee the request-derived fields (address, modes, amenityCategories)
      // are always present in case the server omits them.
      const search: Search = {
        ...serverSearch,
        address: address.trim(),
        modes,
        amenityCategories: categories,
      };

      addSearch(search);
      setResult(search);
      setWarning(partialFailure ?? null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function handleNewSearch() {
    setResult(null);
    setError(null);
    setWarning(null);
    setAddress("");
    setModes(["walk"]);
    setCategories([]);
    setAttachedPoiIds([]);
  }

  if (result) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">{result.address}</h2>
            <p className="text-sm text-gray-500">
              {result.modes.length} mode{result.modes.length !== 1 && "s"} ·{" "}
              {result.amenityCategories.length} categor
              {result.amenityCategories.length === 1 ? "y" : "ies"}
              {result.pois.length > 0 &&
                ` · ${result.pois.length} POI${result.pois.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <button
            onClick={handleNewSearch}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            New Search
          </button>
        </div>
        {warning && <p className="text-sm text-amber-600">{warning}</p>}
        <ResultsView search={result} />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="address" className="mb-1 block text-sm font-medium text-gray-700">
          Candidate Address
        </label>
        <input
          id="address"
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="e.g. 18 King St, Newtown NSW 2042"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
        />
      </div>

      <ModeSelector selected={modes} onChange={setModes} />
      <AmenityCategorySelector selected={categories} onChange={setCategories} />
      <PoiAttachList attachedIds={attachedPoiIds} onChange={setAttachedPoiIds} />

      {loading && <Spinner />}

      {error && <p className="text-center text-sm text-red-600">{error}</p>}

      {!loading && (
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-40 disabled:hover:bg-gray-900"
        >
          Search
        </button>
      )}

      {!hasDestination && address.trim().length > 0 && modes.length >= 1 && (
        <p className="text-center text-sm text-amber-600">
          Select at least one amenity category or attach a POI.
        </p>
      )}
    </form>
  );
}
