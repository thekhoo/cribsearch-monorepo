import type { SearchSummary } from "@cribsearch/shared-types";
import { withTransaction } from "../../../shared/db/with-transaction";
import { listSearchSummaries } from "../data/searches";

export const listSearchesService = async (
  userId: string,
): Promise<SearchSummary[]> =>
  withTransaction((client) => listSearchSummaries(client, userId));
