import type { SearchRequest } from "@cribsearch/shared-types";
import { withTransaction } from "../../../shared/db/with-transaction";
import { insertSearch } from "../data/searches";

export const createSearchRequest = async (
  userId: string,
  request: SearchRequest,
): Promise<{ id: string; status: "Pending" }> => {
  const { searchId, status } = await withTransaction((client) =>
    insertSearch(client, userId, request),
  );
  return { id: searchId, status };
};
