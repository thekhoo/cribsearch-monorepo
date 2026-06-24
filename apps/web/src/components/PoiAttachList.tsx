"use client";

import { useState } from "react";
import type { Poi } from "@homefinder/shared-types";
import { useStore } from "../lib/store";

interface PoiAttachListProps {
  attachedIds: string[];
  onChange: (ids: string[]) => void;
}

export default function PoiAttachList({
  attachedIds,
  onChange,
}: PoiAttachListProps) {
  const { pois, addPoi } = useStore();
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickLabel, setQuickLabel] = useState("Work");
  const [quickAddress, setQuickAddress] = useState("");

  function toggle(id: string) {
    if (attachedIds.includes(id)) {
      onChange(attachedIds.filter((i) => i !== id));
    } else {
      onChange([...attachedIds, id]);
    }
  }

  function handleQuickAdd() {
    if (!quickAddress.trim()) return;
    const newPoi: Poi = {
      id: crypto.randomUUID(),
      label: quickLabel.trim() || "Work",
      address: quickAddress.trim(),
    };
    addPoi(newPoi);
    onChange([...attachedIds, newPoi.id]);
    setQuickLabel("Work");
    setQuickAddress("");
    setShowQuickAdd(false);
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        Your POIs
      </label>
      {pois.length === 0 && !showQuickAdd && (
        <p className="text-sm text-gray-500">
          No POIs yet.{" "}
          <button
            type="button"
            onClick={() => setShowQuickAdd(true)}
            className="underline hover:text-gray-700"
          >
            Add one
          </button>
        </p>
      )}
      {pois.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pois.map((poi) => {
            const active = attachedIds.includes(poi.id);
            return (
              <button
                key={poi.id}
                type="button"
                onClick={() => toggle(poi.id)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                }`}
              >
                {poi.label}
              </button>
            );
          })}
          {!showQuickAdd && (
            <button
              type="button"
              onClick={() => setShowQuickAdd(true)}
              className="rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700"
            >
              + Add POI
            </button>
          )}
        </div>
      )}
      {showQuickAdd && (
        <div className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div>
            <label className="block text-xs text-gray-600">Label</label>
            <input
              type="text"
              value={quickLabel}
              onChange={(e) => setQuickLabel(e.target.value)}
              className="mt-0.5 w-28 rounded border border-gray-300 px-2 py-1 text-sm"
              placeholder="Work"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-600">Address</label>
            <input
              type="text"
              value={quickAddress}
              onChange={(e) => setQuickAddress(e.target.value)}
              className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-sm"
              placeholder="123 Main St, Sydney"
            />
          </div>
          <button
            type="button"
            onClick={handleQuickAdd}
            disabled={!quickAddress.trim()}
            className="rounded bg-gray-900 px-3 py-1 text-sm font-medium text-white disabled:opacity-40"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setShowQuickAdd(false)}
            className="px-2 py-1 text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
