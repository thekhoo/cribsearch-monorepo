import type {
  AttachedPoi,
  JourneySearchMessage,
  Search,
} from "@homefinder/shared-types";
import type { JourneyRequestRepository } from "../ports/journey-request-repository";
import type { MapsProvider } from "../ports/maps-provider";
import { MapsError } from "../ports/maps-provider";

interface Ports {
  repo: JourneyRequestRepository;
  maps: MapsProvider;
}

const TERMINAL_STATUSES = new Set([
  "Complete",
  "PartialFailure",
  "Failed",
]);

export const processJourneyRequest = async (
  msg: JourneySearchMessage,
  { repo, maps }: Ports,
): Promise<void> => {
  const { journeyRequestId: id } = msg;

  const existing = await repo.getById(id);
  if (existing && TERMINAL_STATUSES.has(existing.status)) {
    console.info(`[processJourneyRequest] request ${id} already terminal (${existing.status}), skipping`);
    return;
  }

  await repo.markProcessing(id);
  console.info(`[processJourneyRequest] processing request ${id}`);

  try {
    const amenityGroups = await maps.findAmenities(
      msg.address,
      msg.amenityCategories,
    );

    const attachedPois: AttachedPoi[] = [];
    const poiErrors: string[] = [];

    for (const poi of msg.pois) {
      try {
        const [result] = await maps.computeTravelStats(
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
        console.warn(`[processJourneyRequest] POI "${poi.label}" failed: ${message}`);
        poiErrors.push(`${poi.label}: ${message}`);
      }
    }

    const search: Search = {
      id: `search-${id}`,
      address: msg.address,
      nickname: msg.nickname,
      modes: msg.modes,
      amenityCategories: msg.amenityCategories,
      amenityGroups,
      pois: attachedPois,
      createdAt: new Date().toISOString(),
    };

    if (poiErrors.length > 0) {
      const errorSummary = `${String(poiErrors.length)} destination(s) failed: ${poiErrors.join("; ")}`;
      await repo.saveResult(id, "PartialFailure", search, errorSummary);
      console.info(`[processJourneyRequest] request ${id} completed with PartialFailure`);
    } else {
      await repo.saveResult(id, "Complete", search);
      console.info(`[processJourneyRequest] request ${id} completed successfully`);
    }
  } catch (err) {
    if (err instanceof MapsError) {
      if (err.kind === "transient") {
        console.warn(`[processJourneyRequest] transient error for request ${id}, will retry`);
        throw err;
      }
      await repo.saveResult(id, "Failed", undefined, err.message);
      console.info(`[processJourneyRequest] request ${id} failed: ${err.message}`);
      return;
    }
    throw err;
  }
};
