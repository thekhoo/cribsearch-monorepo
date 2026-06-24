"use client";

import SearchForm from "../components/SearchForm";

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Search</h1>
        <p className="mt-2 text-gray-600">
          Enter a candidate address to evaluate its surroundings.
        </p>
      </header>
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <SearchForm />
      </div>
    </main>
  );
}
