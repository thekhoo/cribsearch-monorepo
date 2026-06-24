"use client";

import type { AmenityCategory } from "@homefinder/shared-types";
import { CATEGORY_META } from "../lib/format";

const ALL_CATEGORIES: AmenityCategory[] = [
  "supermarket",
  "transit_stop",
  "pharmacy",
  "park",
];

interface AmenityCategorySelectorProps {
  selected: AmenityCategory[];
  onChange: (categories: AmenityCategory[]) => void;
}

export default function AmenityCategorySelector({
  selected,
  onChange,
}: AmenityCategorySelectorProps) {
  function toggle(cat: AmenityCategory) {
    if (selected.includes(cat)) {
      onChange(selected.filter((c) => c !== cat));
    } else {
      onChange([...selected, cat]);
    }
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        Amenity Categories
      </label>
      <div className="flex flex-wrap gap-2">
        {ALL_CATEGORIES.map((cat) => {
          const active = selected.includes(cat);
          return (
            <button
              key={cat}
              type="button"
              onClick={() => toggle(cat)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                active
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
              }`}
            >
              {CATEGORY_META[cat].label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
