"use client";

import type { TransportMode } from "@homefinder/shared-types";
import { MODE_META } from "../lib/format";

const ALL_MODES: TransportMode[] = ["walk", "transit", "cycle", "drive"];

interface ModeSelectorProps {
  selected: TransportMode[];
  onChange: (modes: TransportMode[]) => void;
}

export default function ModeSelector({ selected, onChange }: ModeSelectorProps) {
  function toggle(mode: TransportMode) {
    if (selected.includes(mode)) {
      if (selected.length > 1) {
        onChange(selected.filter((m) => m !== mode));
      }
    } else {
      onChange([...selected, mode]);
    }
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        Transport Modes
      </label>
      <div className="flex flex-wrap gap-2">
        {ALL_MODES.map((mode) => {
          const active = selected.includes(mode);
          return (
            <button
              key={mode}
              type="button"
              onClick={() => toggle(mode)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                active
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
              }`}
            >
              {MODE_META[mode].icon} {MODE_META[mode].label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
