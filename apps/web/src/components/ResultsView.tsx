"use client";

import { useState } from "react";
import type {
  AmenityGroup as AmenityGroupType,
  Search,
  TransportMode,
} from "@cribsearch/shared-types";
import { CATEGORY_META, MODE_META } from "../lib/format";
import DestinationCard from "./DestinationCard";

type Metric = "duration" | "distance";

// ── Per-category amenity group with its own independent sort state ──────────

interface AmenityGroupProps {
  group: AmenityGroupType;
  modes: TransportMode[];
}

function AmenityGroup({ group, modes }: AmenityGroupProps) {
  const hasModes = modes.length > 0;

  const defaultMode: TransportMode = modes.includes("walk")
    ? "walk"
    : (modes[0] ?? "walk");

  const [selectedMode, setSelectedMode] = useState<TransportMode>(defaultMode);
  const [selectedMetric, setSelectedMetric] = useState<Metric>("duration");

  const sortedDestinations = [...group.destinations].sort((a, b) => {
    if (!hasModes) return 0;
    const statA = a.travelStats.find((s) => s.mode === selectedMode);
    const statB = b.travelStats.find((s) => s.mode === selectedMode);
    if (!statA && !statB) return 0;
    if (!statA) return 1;
    if (!statB) return -1;
    const key = selectedMetric === "duration" ? "seconds" : "meters";
    return statA[key] - statB[key];
  });

  return (
    <div>
      {/* Category heading row with per-group sort controls */}
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {CATEGORY_META[group.category].label}
        </h4>
        {hasModes && (
          <div className="flex items-center gap-2">
            {/* Mode dropdown */}
            <select
              value={selectedMode}
              onChange={(e) =>
                setSelectedMode(e.target.value as TransportMode)
              }
              className="rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700"
            >
              {modes.map((mode) => (
                <option key={mode} value={mode}>
                  {MODE_META[mode].icon} {MODE_META[mode].label}
                </option>
              ))}
            </select>
            {/* Duration / Distance segmented toggle */}
            <div className="flex">
              <button
                type="button"
                onClick={() => setSelectedMetric("duration")}
                className={`rounded-l border px-2 py-1 text-sm ${
                  selectedMetric === "duration"
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-300 bg-white text-gray-700"
                }`}
              >
                Duration
              </button>
              <button
                type="button"
                onClick={() => setSelectedMetric("distance")}
                className={`-ml-px rounded-r border px-2 py-1 text-sm ${
                  selectedMetric === "distance"
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-300 bg-white text-gray-700"
                }`}
              >
                Distance
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="space-y-2">
        {sortedDestinations.map((dest) => (
          <DestinationCard
            key={dest.id}
            name={dest.name}
            address={dest.address}
            travelStats={dest.travelStats}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main results view ────────────────────────────────────────────────────────

interface ResultsViewProps {
  search: Search;
}

export default function ResultsView({ search }: ResultsViewProps) {
  const hasPois = search.pois.length > 0;
  const hasAmenities = search.amenityGroups.length > 0;

  // Sort a copy of POIs alphabetically by address, case-insensitive — never mutate original
  const sortedPois = [...search.pois].sort((a, b) =>
    a.address.localeCompare(b.address, undefined, { sensitivity: "base" }),
  );

  return (
    <div className="space-y-8">
      {/* Places of Interest — declared by you */}
      {hasPois && (
        <section>
          <div className="mb-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
              Places of Interest
            </h3>
            <p className="text-xs text-gray-500">Places you told us matter</p>
          </div>
          <div className="space-y-2">
            {sortedPois.map((poi) => (
              <DestinationCard
                key={poi.poiId}
                name={poi.label}
                address={poi.address}
                travelStats={poi.travelStats}
              />
            ))}
          </div>
        </section>
      )}

      {hasPois && hasAmenities && <hr className="border-gray-200" />}

      {/* Amenities — found for you */}
      {hasAmenities && (
        <section>
          <div className="mb-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
              Amenities
            </h3>
            <p className="text-xs text-gray-500">
              Nearby places we found for you
            </p>
          </div>
          <div className="space-y-6">
            {search.amenityGroups.map((group) => (
              <AmenityGroup
                key={group.category}
                group={group}
                modes={search.modes}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
