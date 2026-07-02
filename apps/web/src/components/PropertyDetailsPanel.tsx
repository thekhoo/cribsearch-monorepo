"use client";

import { useState } from "react";
import type { PricePeriod, Search, UpdateSearchAnnotationRequest } from "@cribsearch/shared-types";
import { useStore } from "../lib/store";
import { formatPrice, PERIOD_OPTIONS } from "../lib/format";

interface PropertyDetailsPanelProps {
  search: Search;
  onUpdated: (search: Search) => void;
}

// Build the list of ISO 4217 currency codes, falling back to common ones.
function getSupportedCurrencies(): string[] {
  if (typeof Intl !== "undefined" && "supportedValuesOf" in Intl) {
    try {
      return (Intl as typeof Intl & { supportedValuesOf: (key: string) => string[] }).supportedValuesOf("currency");
    } catch {
      // fall through
    }
  }
  return ["AUD", "EUR", "GBP", "USD"];
}

const CURRENCY_OPTIONS = getSupportedCurrencies();

export default function PropertyDetailsPanel({
  search,
  onUpdated,
}: PropertyDetailsPanelProps) {
  const { updateSearchAnnotation } = useStore();

  const [editing, setEditing] = useState(false);

  // Edit-form state — seeded when entering edit mode
  const [name, setName] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [currency, setCurrency] = useState("");
  const [period, setPeriod] = useState<PricePeriod | "">("");
  const [listingUrl, setListingUrl] = useState("");
  const [description, setDescription] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function enterEditMode() {
    setName(search.searchName ?? "");
    setAmountStr(
      search.propertyDetails?.price?.amount != null
        ? String(search.propertyDetails.price.amount)
        : "",
    );
    setCurrency(search.propertyDetails?.price?.currency ?? "EUR");
    setPeriod(search.propertyDetails?.price?.period ?? "pcm");
    setListingUrl(search.propertyDetails?.listingUrl ?? "");
    setDescription(search.propertyDetails?.description ?? "");
    setSaveError(null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setSaveError(null);
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setSaveError(null);

    const trimmedName = name.trim();
    const trimmedUrl = listingUrl.trim();
    const trimmedDesc = description.trim();

    // Build price sub-object — only include fields with values
    const parsedAmount = parseFloat(amountStr);
    const hasAmount = amountStr.trim() !== "" && isFinite(parsedAmount) && parsedAmount > 0;

    const price: NonNullable<UpdateSearchAnnotationRequest["propertyDetails"]>["price"] = {};
    if (hasAmount) price.amount = parsedAmount;
    if (currency) price.currency = currency;
    if (period) price.period = period as PricePeriod;

    const propertyDetails: UpdateSearchAnnotationRequest["propertyDetails"] = {};
    if (Object.keys(price).length > 0) propertyDetails.price = price;
    if (trimmedUrl) propertyDetails.listingUrl = trimmedUrl;
    if (trimmedDesc) propertyDetails.description = trimmedDesc;

    const body: UpdateSearchAnnotationRequest = {
      searchName: trimmedName || null,
      propertyDetails,
    };

    try {
      const updated = await updateSearchAnnotation(search.id, body);
      onUpdated(updated);
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const priceLabel = formatPrice(search.propertyDetails?.price);

  // ── Read view ─────────────────────────────────────────────────────

  if (!editing) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Property details
          </h3>
          <button
            onClick={enterEditMode}
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Edit
          </button>
        </div>
        <dl className="space-y-2 text-sm">
          <div className="flex gap-2">
            <dt className="w-24 shrink-0 text-gray-500">Name</dt>
            <dd className={search.searchName ? "text-gray-900" : "text-gray-400"}>
              {search.searchName ?? "—"}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-24 shrink-0 text-gray-500">Price</dt>
            <dd className={priceLabel ? "text-gray-900" : "text-gray-400"}>
              {priceLabel ?? "—"}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-24 shrink-0 text-gray-500">Link</dt>
            <dd className="min-w-0 flex-1">
              {search.propertyDetails?.listingUrl ? (
                <a
                  href={search.propertyDetails.listingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-blue-600 hover:underline"
                  title={search.propertyDetails.listingUrl}
                >
                  {search.propertyDetails.listingUrl} ↗
                </a>
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-24 shrink-0 text-gray-500">Notes</dt>
            <dd className={search.propertyDetails?.description ? "text-gray-900" : "text-gray-400"}>
              {search.propertyDetails?.description ?? "—"}
            </dd>
          </div>
        </dl>
      </div>
    );
  }

  // ── Edit view ─────────────────────────────────────────────────────

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Property details
      </h3>
      <div className="space-y-3">
        {/* Name */}
        <div>
          <label className="mb-0.5 block text-xs text-gray-600">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={saving}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:opacity-50"
            placeholder="e.g. Corner apartment on Mariahilfer"
          />
        </div>

        {/* Price */}
        <div>
          <label className="mb-0.5 block text-xs text-gray-600">Price</label>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              step="any"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              disabled={saving}
              className="w-28 rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:opacity-50"
              placeholder="1500"
            />
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              disabled={saving}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:opacity-50"
            >
              <option value="">— currency —</option>
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as PricePeriod | "")}
              disabled={saving}
              className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:opacity-50"
            >
              <option value="">— period —</option>
              {PERIOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Listing URL */}
        <div>
          <label className="mb-0.5 block text-xs text-gray-600">Listing URL</label>
          <input
            type="text"
            value={listingUrl}
            onChange={(e) => setListingUrl(e.target.value)}
            disabled={saving}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:opacity-50"
            placeholder="immobilienscout24.de/…"
          />
        </div>

        {/* Description */}
        <div>
          <label className="mb-0.5 block text-xs text-gray-600">Notes</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={saving}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:opacity-50"
            placeholder="Any notes about this property…"
          />
        </div>

        {saveError && <p className="text-sm text-red-600">{saveError}</p>}

        <div className="flex gap-2">
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="rounded-lg bg-gray-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            onClick={cancelEdit}
            disabled={saving}
            className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
