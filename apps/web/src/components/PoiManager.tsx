"use client";

import { useState } from "react";
import type { Poi } from "@cribsearch/shared-types";
import { useStore } from "../lib/store";
import EmptyState from "./EmptyState";

export default function PoiManager() {
  const { pois, addPoi, updatePoi, deletePoi } = useStore();

  const [addLabel, setAddLabel] = useState("Work");
  const [addAddress, setAddAddress] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editAddress, setEditAddress] = useState("");

  function handleAdd() {
    if (!addAddress.trim()) return;
    const poi: Poi = {
      id: crypto.randomUUID(),
      label: addLabel.trim() || "Work",
      address: addAddress.trim(),
    };
    addPoi(poi);
    setAddLabel("Work");
    setAddAddress("");
  }

  function startEdit(poi: Poi) {
    setEditingId(poi.id);
    setEditLabel(poi.label);
    setEditAddress(poi.address);
  }

  function commitEdit(id: string) {
    if (editLabel.trim() && editAddress.trim()) {
      updatePoi(id, { label: editLabel.trim(), address: editAddress.trim() });
    }
    setEditingId(null);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Add POI
        </h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-600">Label</label>
            <input
              type="text"
              value={addLabel}
              onChange={(e) => setAddLabel(e.target.value)}
              className="mt-0.5 w-32 rounded border border-gray-300 px-2 py-1.5 text-sm"
              placeholder="Work"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-600">Address</label>
            <input
              type="text"
              value={addAddress}
              onChange={(e) => setAddAddress(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
              className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              placeholder="123 Main St, Sydney NSW 2000"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={!addAddress.trim()}
            className="rounded-lg bg-gray-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </div>

      {pois.length === 0 ? (
        <EmptyState message="No POIs yet. Add one above to get started." />
      ) : (
        <div className="space-y-2">
          {pois.map((poi) =>
            editingId === poi.id ? (
              <div
                key={poi.id}
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
              >
                <input
                  autoFocus
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="w-32 rounded border border-gray-300 px-2 py-1 text-sm"
                />
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
                />
                <button
                  onClick={() => commitEdit(poi.id)}
                  className="text-sm font-medium text-gray-900 hover:text-gray-700"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div
                key={poi.id}
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900">{poi.label}</p>
                  <p className="truncate text-sm text-gray-500">
                    {poi.address}
                  </p>
                </div>
                <button
                  onClick={() => startEdit(poi)}
                  className="shrink-0 text-sm text-gray-600 hover:text-gray-900"
                >
                  Edit
                </button>
                <button
                  onClick={() => deletePoi(poi.id)}
                  className="shrink-0 text-sm text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}
