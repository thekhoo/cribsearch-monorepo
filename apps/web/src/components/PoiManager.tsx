"use client";

import { useState } from "react";
import type { Poi } from "@cribsearch/shared-types";
import { useStore } from "../lib/store";
import EmptyState from "./EmptyState";

export default function PoiManager() {
  const { pois, addPoi, updatePoi, deletePoi } = useStore();

  // ── Add form ────────────────────────────────────────────────────
  const [addLabel, setAddLabel] = useState("Work");
  const [addAddress, setAddAddress] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  async function handleAdd() {
    if (!addAddress.trim() || isAdding) return;
    setIsAdding(true);
    setAddError(null);
    try {
      await addPoi({
        label: addLabel.trim() || "Work",
        address: addAddress.trim(),
      });
      setAddLabel("Work");
      setAddAddress("");
    } catch (err) {
      setAddError(
        err instanceof Error ? err.message : "Failed to add place of interest",
      );
    } finally {
      setIsAdding(false);
    }
  }

  // ── Edit form ────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  function startEdit(poi: Poi) {
    setEditingId(poi.id);
    setEditLabel(poi.label);
    setEditAddress(poi.address);
    setEditError(null);
  }

  async function commitEdit(id: string) {
    if (!editLabel.trim() || !editAddress.trim() || isSaving) return;
    setIsSaving(true);
    setEditError(null);
    try {
      await updatePoi(id, {
        label: editLabel.trim(),
        address: editAddress.trim(),
      });
      setEditingId(null);
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : "Failed to update place of interest",
      );
    } finally {
      setIsSaving(false);
    }
  }

  // ── Delete ───────────────────────────────────────────────────────
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (deletingId) return;
    setDeletingId(id);
    setDeleteError(null);
    try {
      await deletePoi(id);
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete place of interest",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Add form */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Add Place of Interest
        </h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-600">Label</label>
            <input
              type="text"
              value={addLabel}
              onChange={(e) => setAddLabel(e.target.value)}
              disabled={isAdding}
              className="mt-0.5 w-32 rounded border border-gray-300 px-2 py-1.5 text-sm disabled:opacity-50"
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
                if (e.key === "Enter") void handleAdd();
              }}
              disabled={isAdding}
              className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1.5 text-sm disabled:opacity-50"
              placeholder="123 Main St, Sydney NSW 2000"
            />
          </div>
          <button
            onClick={() => void handleAdd()}
            disabled={!addAddress.trim() || isAdding}
            className="rounded-lg bg-gray-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40"
          >
            {isAdding ? "Adding…" : "Add"}
          </button>
        </div>
        {addError && (
          <p className="mt-2 text-sm text-red-600">{addError}</p>
        )}
      </div>

      {/* Delete error banner */}
      {deleteError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
          {deleteError}
        </p>
      )}

      {pois.length === 0 ? (
        <EmptyState message="No places of interest yet. Add one above to get started." />
      ) : (
        <div className="space-y-2">
          {pois.map((poi) =>
            editingId === poi.id ? (
              <div
                key={poi.id}
                className="space-y-1 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <input
                    autoFocus
                    type="text"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    disabled={isSaving}
                    className="w-32 rounded border border-gray-300 px-2 py-1 text-sm disabled:opacity-50"
                  />
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    disabled={isSaving}
                    className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm disabled:opacity-50"
                  />
                  <button
                    onClick={() => void commitEdit(poi.id)}
                    disabled={isSaving}
                    className="text-sm font-medium text-gray-900 hover:text-gray-700 disabled:opacity-50"
                  >
                    {isSaving ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    disabled={isSaving}
                    className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
                {editError && (
                  <p className="text-sm text-red-600">{editError}</p>
                )}
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
                  disabled={!!deletingId}
                  className="shrink-0 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => void handleDelete(poi.id)}
                  disabled={deletingId === poi.id}
                  className="shrink-0 text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
                >
                  {deletingId === poi.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}
