import type { Poi, UpdatePoiRequest } from "@cribsearch/shared-types";
import { withTransaction } from "../../../shared/db/with-transaction";
import { getMaps } from "../../../shared/maps";
import { getPoiRow, updatePoi } from "../data/places-of-interest";

export const updatePoiService = async (
  userId: string,
  poiId: string,
  request: UpdatePoiRequest,
): Promise<Poi | null> => {
  const existing = await withTransaction((client) =>
    getPoiRow(client, userId, poiId),
  );
  if (!existing) return null;

  const addressChanged = request.address.trim() !== existing.address.trim();

  if (addressChanged) {
    const provider = await getMaps();
    const geocode = await provider.geocode(request.address);
    return withTransaction((client) =>
      updatePoi(client, userId, poiId, request, geocode),
    );
  }

  // Address unchanged — keep existing geocode stored in DB (pass undefined).
  return withTransaction((client) =>
    updatePoi(client, userId, poiId, request, undefined),
  );
};
