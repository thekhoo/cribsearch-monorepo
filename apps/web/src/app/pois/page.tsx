"use client";

import PoiManager from "../../components/PoiManager";

export default function PoisPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">POIs</h1>
        <p className="mt-2 text-gray-600">
          Manage your reusable points of interest. Attach them to any Search.
        </p>
      </header>
      <PoiManager />
    </main>
  );
}
