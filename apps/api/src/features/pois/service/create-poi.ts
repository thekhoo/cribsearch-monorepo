import type { Poi, CreatePoiRequest } from "@cribsearch/shared-types";
import { withTransaction } from "../../../shared/db/with-transaction";
import { getMaps } from "../../../shared/maps";
import { insertPoi } from "../data/places-of-interest";

export const createPoi = async (
  userId: string,
  request: CreatePoiRequest,
): Promise<Poi> => {
  const provider = await getMaps();
  const geocode = await provider.geocode(request.address);
  return withTransaction((client) => insertPoi(client, userId, request, geocode));
};
