import type { JourneySearchRequest } from "@cribsearch/shared-types";
import { withTransaction } from "../../../shared/db/with-transaction";
import { insertSearch } from "../data/searches";

export const createJourneyRequest = async (
  request: JourneySearchRequest,
): Promise<{ id: string; status: "Pending" }> =>
  withTransaction((client) => insertSearch(client, request));
