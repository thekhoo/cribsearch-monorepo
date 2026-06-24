import type { ApiResponse, Property } from "@homefinder/shared-types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/** Placeholder data so the page renders before the API/Supabase are wired up. */
const SAMPLE_PROPERTIES: Property[] = [
  {
    id: "sample-1",
    title: "Sunny 2-bed apartment",
    description: "Bright corner unit with a balcony and city views.",
    priceCents: 425_000_00,
    bedrooms: 2,
    bathrooms: 1,
    address: {
      line1: "12 Market Street",
      city: "Sydney",
      state: "NSW",
      postalCode: "2000",
      country: "AU",
    },
    createdAt: new Date().toISOString(),
  },
];

async function getProperties(): Promise<Property[]> {
  try {
    const res = await fetch(`${API_URL}/properties`, { cache: "no-store" });
    if (!res.ok) return SAMPLE_PROPERTIES;
    const body = (await res.json()) as ApiResponse<Property[]>;
    return body.data.length > 0 ? body.data : SAMPLE_PROPERTIES;
  } catch {
    // API not running yet — fall back to sample data.
    return SAMPLE_PROPERTIES;
  }
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default async function Home() {
  const properties = await getProperties();

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">HomeFinder</h1>
        <p className="mt-2 text-gray-600">Find your next home.</p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2">
        {properties.map((property) => (
          <li
            key={property.id}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <h2 className="text-lg font-semibold">{property.title}</h2>
            <p className="mt-1 text-sm text-gray-600">{property.description}</p>
            <p className="mt-3 text-sm text-gray-500">
              {property.bedrooms} bed · {property.bathrooms} bath ·{" "}
              {property.address.city}, {property.address.state}
            </p>
            <p className="mt-2 text-xl font-bold">{formatPrice(property.priceCents)}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
