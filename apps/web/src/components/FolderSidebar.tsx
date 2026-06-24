"use client";

import { useState } from "react";
import { useStore } from "../lib/store";

interface FolderSidebarProps {
  activeFolderId: string | null;
  onSelect: (folderId: string | null) => void;
}

export default function FolderSidebar({
  activeFolderId,
  onSelect,
}: FolderSidebarProps) {
  const { folders, addFolder, renameFolder, deleteFolder } = useStore();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  function handleCreate() {
    if (!newName.trim()) return;
    const folder = { id: crypto.randomUUID(), name: newName.trim() };
    addFolder(folder);
    setNewName("");
  }

  function startEdit(id: string, currentName: string) {
    setEditingId(id);
    setEditName(currentName);
  }

  function commitEdit(id: string) {
    if (editName.trim()) {
      renameFolder(id, editName.trim());
    }
    setEditingId(null);
  }

  function handleDelete(id: string) {
    deleteFolder(id);
    if (activeFolderId === id) onSelect(null);
  }

  const buttonClass = (active: boolean) =>
    `w-full rounded-lg px-3 py-1.5 text-left text-sm font-medium transition ${
      active
        ? "bg-gray-900 text-white"
        : "text-gray-700 hover:bg-gray-100"
    }`;

  return (
    <aside className="w-48 shrink-0 space-y-1">
      <button
        onClick={() => onSelect(null)}
        className={buttonClass(activeFolderId === null)}
      >
        All
      </button>
      <button
        onClick={() => onSelect("__uncategorised__")}
        className={buttonClass(activeFolderId === "__uncategorised__")}
      >
        Uncategorised
      </button>

      <hr className="my-2 border-gray-200" />

      {folders.map((folder) => (
        <div key={folder.id} className="group flex items-center gap-1">
          {editingId === folder.id ? (
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={() => commitEdit(folder.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit(folder.id);
                if (e.key === "Escape") setEditingId(null);
              }}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            />
          ) : (
            <>
              <button
                onClick={() => onSelect(folder.id)}
                className={`${buttonClass(activeFolderId === folder.id)} flex-1 truncate`}
              >
                {folder.name}
              </button>
              <button
                onClick={() => startEdit(folder.id, folder.name)}
                className="hidden shrink-0 px-1 text-xs text-gray-400 hover:text-gray-700 group-hover:block"
                title="Rename"
              >
                ✎
              </button>
              <button
                onClick={() => handleDelete(folder.id)}
                className="hidden shrink-0 px-1 text-xs text-red-400 hover:text-red-600 group-hover:block"
                title="Delete folder"
              >
                ×
              </button>
            </>
          )}
        </div>
      ))}

      <div className="flex gap-1 pt-1">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
          placeholder="New folder"
          className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
        />
        <button
          onClick={handleCreate}
          disabled={!newName.trim()}
          className="shrink-0 rounded bg-gray-900 px-2 py-1 text-xs font-medium text-white disabled:opacity-40"
        >
          +
        </button>
      </div>
    </aside>
  );
}
