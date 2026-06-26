import type { RequestStatus, Search } from "@cribsearch/shared-types";
import { withTransaction } from "../../../shared/db/with-transaction";
import { getSearchRow } from "../data/searches";
import { getDestinations } from "../data/search-destinations";
import { rowsToSearch } from "../data/mappers";

export interface JourneyRequestView {
  id: string;
  status: RequestStatus;
  search?: Search;
  error?: string;
}

export const getJourneyRequest = async (
  id: string,
): Promise<JourneyRequestView | null> =>
  withTransaction(async (client) => {
    const row = await getSearchRow(client, id);
    if (!row) return null;
    const destinations = await getDestinations(client, id);
    const hasResult =
      row.status === "Complete" || row.status === "PartialFailure";
    return {
      id: row.id,
      status: row.status,
      search: hasResult ? rowsToSearch(row, destinations) : undefined,
      error: row.error ?? undefined,
    };
  });
