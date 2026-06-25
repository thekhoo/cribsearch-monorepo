import type { Property } from "@cribsearch/shared-types";
import { getSupabase } from "../db/supabase";

const TABLE = "properties";

/** Fetches all properties. Replace with pagination/filtering as the domain grows. */
export const listProperties = async (): Promise<Property[]> => {
  const { data, error } = await getSupabase().from(TABLE).select("*");
  if (error) {
    throw new Error(`Failed to list properties: ${error.message}`);
  }
  return (data ?? []) as Property[];
};
