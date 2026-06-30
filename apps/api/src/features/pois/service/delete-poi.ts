import { withTransaction } from "../../../shared/db/with-transaction";
import { deletePoi } from "../data/places-of-interest";

export const deletePoiService = async (
  userId: string,
  poiId: string,
): Promise<boolean> =>
  withTransaction((client) => deletePoi(client, userId, poiId));
