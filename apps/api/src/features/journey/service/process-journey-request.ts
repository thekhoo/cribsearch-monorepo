import type {
  AttachedPoi,
  JourneySearchMessage,
  Search,
} from "@cribsearch/shared-types";
import { logger } from "@cribsearch/logger";
import { withTransaction } from "../../../shared/db/with-transaction";
import { getSearchRow, markProcessing, updateResult } from "../data/searches";
import { insertDestinations } from "../data/search-destinations";
import { searchToDestinationRows } from "../data/mappers";
import { getMaps, MapsError } from "../../../shared/maps";

const TERMINAL_STATUSES = new Set([
  "Complete",
  "PartialFailure",
  "Failed",
]);

export const processJourneyRequest = async (
  msg: JourneySearchMessage,
): Promise<void> => {
  const { journeyRequestId: id } = msg;
  const log = logger.child({
    component: "process-journey",
    journeyRequestId: id,
  });

  const existing = await withTransaction((c) => getSearchRow(c, id));
  if (existing && TERMINAL_STATUSES.has(existing.status)) {
    log.info("request already terminal, skipping", { status: existing.status });
    return;
  }

  await withTransaction((c) => markProcessing(c, id));
  log.info("processing request");

  try {
    const provider = await getMaps();

    const amenityGroups = await provider.findAmenities(
      msg.address,
      msg.amenityCategories,
      msg.modes,
    );

    const attachedPois: AttachedPoi[] = [];
    const poiErrors: string[] = [];

    for (const poi of msg.pois) {
      try {
        const [result] = await provider.computeTravelStats(
          msg.address,
          [poi],
          msg.modes,
        );
        if (result) {
          attachedPois.push({
            poiId: result.id,
            label: poi.label,
            address: poi.address,
            travelStats: result.travelStats,
          });
        }
      } catch (err) {
        if (err instanceof MapsError && err.kind === "transient") {
          throw err;
        }
        const message = err instanceof Error ? err.message : String(err);
        log.warn("POI failed", { poi: poi.label, reason: message });
        poiErrors.push(`${poi.label}: ${message}`);
      }
    }

    const search: Search = {
      id,
      address: msg.address,
      nickname: msg.nickname,
      modes: msg.modes,
      amenityCategories: msg.amenityCategories,
      amenityGroups,
      pois: attachedPois,
      createdAt: new Date().toISOString(),
    };

    const destinationRows = searchToDestinationRows(search);

    if (poiErrors.length > 0) {
      const errorSummary = `${String(poiErrors.length)} destination(s) failed: ${poiErrors.join("; ")}`;
      await withTransaction(async (c) => {
        await updateResult(c, id, "PartialFailure", errorSummary);
        await insertDestinations(c, id, destinationRows);
      });
      log.info("request completed with PartialFailure");
    } else {
      await withTransaction(async (c) => {
        await updateResult(c, id, "Complete");
        await insertDestinations(c, id, destinationRows);
      });
      log.info("request completed successfully");
    }
  } catch (err) {
    if (err instanceof MapsError) {
      if (err.kind === "transient") {
        log.warn("transient error, will retry");
        throw err;
      }
      await withTransaction((c) => updateResult(c, id, "Failed", err.message));
      log.info("request failed", { reason: err.message });
      return;
    }
    throw err;
  }
};
