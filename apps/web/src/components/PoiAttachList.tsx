"use client";

import { useState } from "react";
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
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  function toggle(id: string) {
    if (attachedIds.includes(id)) {
      onChange(attachedIds.filter((i) => i !== id));
    } else {
      onChange([...attachedIds, id]);
    }
  }

  async function handleQuickAdd() {
    if (!quickAddress.trim() || isAdding) return;
    setIsAdding(true);
    setAddError(null);
    try {
      const newPoi = await addPoi({
        label: quickLabel.trim() || "Work",
        address: quickAddress.trim(),
      });
      // Use the server-assigned id so the attachment references a real DB record.
      onChange([...attachedIds, newPoi.id]);
      setQuickLabel("Work");
      setQuickAddress("");
      setShowQuickAdd(false);
    } catch (err) {
      setAddError(
        err instanceof Error ? err.message : "Failed to add place of interest",
      );
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        Places of Interest
      </label>
      {pois.length === 0 && !showQuickAdd && (
        <p className="text-sm text-gray-500">
          No places of interest yet.{" "}
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
              + Add place
            </button>
          )}
        </div>
      )}
      {showQuickAdd && (
        <div className="mt-2 space-y-1 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="block text-xs text-gray-600">Label</label>
              <input
                type="text"
                value={quickLabel}
                onChange={(e) => setQuickLabel(e.target.value)}
                disabled={isAdding}
                className="mt-0.5 w-28 rounded border border-gray-300 px-2 py-1 text-sm disabled:opacity-50"
                placeholder="Work"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-600">Address</label>
              <input
                type="text"
                value={quickAddress}
                onChange={(e) => setQuickAddress(e.target.value)}
                disabled={isAdding}
                className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-sm disabled:opacity-50"
                placeholder="Kärntner Straße 10, 1010 Wien"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleQuickAdd()}
              disabled={!quickAddress.trim() || isAdding}
              className="rounded bg-gray-900 px-3 py-1 text-sm font-medium text-white disabled:opacity-40"
            >
              {isAdding ? "Adding…" : "Add"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowQuickAdd(false);
                setAddError(null);
              }}
              disabled={isAdding}
              className="px-2 py-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
          {addError && (
            <p className="text-sm text-red-600">{addError}</p>
          )}
        </div>
      )}
    </div>
  );
}
