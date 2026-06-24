/**
 * Shared contracts between the web frontend and the API backend.
 * Keep this package free of runtime dependencies — types only.
 */

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface Property {
  id: string;
  title: string;
  description: string;
  /** Price stored in the smallest currency unit to avoid float errors. */
  priceCents: number;
  bedrooms: number;
  bathrooms: number;
  address: Address;
  /** ISO-8601 timestamp. */
  createdAt: string;
}

/** Standard envelope for successful list/detail responses. */
export interface ApiResponse<T> {
  data: T;
}

/** Standard envelope for error responses. */
export interface ApiError {
  error: string;
}
