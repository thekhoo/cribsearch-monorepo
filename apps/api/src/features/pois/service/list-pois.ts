import type { Poi } from "@cribsearch/shared-types";
import { withTransaction } from "../../../shared/db/with-transaction";
import { listPois } from "../data/places-of-interest";

export const listPoisService = async (userId: string): Promise<Poi[]> =>
  withTransaction((client) => listPois(client, userId));
