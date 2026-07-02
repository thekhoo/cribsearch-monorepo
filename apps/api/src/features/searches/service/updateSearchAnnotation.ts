import type { PropertyDetails } from "@cribsearch/shared-types";
import { withTransaction } from "../../../shared/db/with-transaction";
import { updateSearchAnnotation, getSearchRow } from "../data/searches";
import { getDestinations } from "../data/search-destinations";
import { rowsToSearch } from "../data/mappers";
import type { SearchRequestView } from "./get-search-request";

/** Apply annotation fields to an existing search and return the updated view.
 *  Returns null when the search does not exist or is not owned by userId. */
export const updateSearchAnnotationService = async (
  id: string,
  userId: string,
  annotation: { searchName?: string | null; propertyDetails?: PropertyDetails },
): Promise<SearchRequestView | null> =>
  withTransaction(async (client) => {
    const rowsAffected = await updateSearchAnnotation(client, id, userId, annotation);
    if (rowsAffected === 0) return null;

    const row = await getSearchRow(client, id, userId);
    if (!row) return null;

    const destinations = await getDestinations(client, id);
    const hasResult = row.status === "Complete" || row.status === "PartialFailure";
    return {
      id: row.searchId,
      status: row.status,
      search: hasResult ? rowsToSearch(row, destinations) : undefined,
      error: row.statusReason ?? undefined,
    };
  });
