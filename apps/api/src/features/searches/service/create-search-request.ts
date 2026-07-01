import type { SearchRequest } from "@cribsearch/shared-types";
import { withTransaction } from "../../../shared/db/with-transaction";
import { insertSearch } from "../data/searches";

export const createSearchRequest = async (
  request: SearchRequest,
): Promise<{ id: string; status: "Pending" }> => {
  const { searchId, status } = await withTransaction((client) =>
    insertSearch(client, request),
  );
  return { id: searchId, status };
};
