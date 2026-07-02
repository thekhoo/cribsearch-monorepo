import type { RequestStatus, Search } from "@cribsearch/shared-types";
import { withTransaction } from "../../../shared/db/with-transaction";
import { getSearchRow } from "../data/searches";
import { getDestinations } from "../data/search-destinations";
import { rowsToSearch } from "../data/mappers";

export interface SearchRequestView {
  id: string;
  status: RequestStatus;
  search?: Search;
  error?: string;
}

export const getSearchRequest = async (
  id: string,
  userId: string,
): Promise<SearchRequestView | null> =>
  withTransaction(async (client) => {
    const row = await getSearchRow(client, id, userId);
    if (!row) return null;
    const destinations = await getDestinations(client, id);
    const hasResult =
      row.status === "Complete" || row.status === "PartialFailure";
    return {
      id: row.searchId,
      status: row.status,
      search: hasResult ? rowsToSearch(row, destinations) : undefined,
      error: row.statusReason ?? undefined,
    };
  });
