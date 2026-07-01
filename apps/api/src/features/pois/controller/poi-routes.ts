import { Router } from "express";
import type { ApiError, CreatePoiRequest, UpdatePoiRequest } from "@cribsearch/shared-types";
import { MapsError } from "../../../shared/maps";
import { requireUserId } from "../../../shared/http/require-user-id";
import { validatePoiRequest } from "../service/validate-poi-request";
import { createPoi } from "../service/create-poi";
import { updatePoiService } from "../service/update-poi";
import { listPoisService } from "../service/list-pois";
import { deletePoiService } from "../service/delete-poi";

export const poiRouter: Router = Router();

/** Translate a MapsError to an HTTP status code and message. */
const mapsErrorToResponse = (
  err: MapsError,
): { status: number; error: string } => {
  if (err.kind === "transient") {
    return { status: 503, error: "geocoding service temporarily unavailable" };
  }
  return { status: 400, error: `geocode failed: ${err.message}` };
};

poiRouter.get("/", async (req, res, next) => {
  try {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const pois = await listPoisService(userId);
    res.status(200).json(pois);
  } catch (err) {
    next(err);
  }
});

poiRouter.post("/", async (req, res, next) => {
  try {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const body = req.body as CreatePoiRequest;
    const validation = validatePoiRequest(body);
    if (!validation.ok) {
      const error: ApiError = { error: validation.error };
      res.status(400).json(error);
      return;
    }

    const poi = await createPoi(userId, body);
    req.log.info("created POI", { poiId: poi.id, userId });
    res.status(201).json(poi);
  } catch (err) {
    if (err instanceof MapsError) {
      const { status, error } = mapsErrorToResponse(err);
      const body: ApiError = { error };
      res.status(status).json(body);
      return;
    }
    next(err);
  }
});

poiRouter.put("/:poiId", async (req, res, next) => {
  try {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const body = req.body as UpdatePoiRequest;
    const validation = validatePoiRequest(body);
    if (!validation.ok) {
      const error: ApiError = { error: validation.error };
      res.status(400).json(error);
      return;
    }

    const poi = await updatePoiService(userId, req.params.poiId ?? "", body);
    if (!poi) {
      const error: ApiError = { error: "poi not found" };
      res.status(404).json(error);
      return;
    }

    req.log.info("updated POI", { poiId: poi.id, userId });
    res.status(200).json(poi);
  } catch (err) {
    if (err instanceof MapsError) {
      const { status, error } = mapsErrorToResponse(err);
      const body: ApiError = { error };
      res.status(status).json(body);
      return;
    }
    next(err);
  }
});

poiRouter.delete("/:poiId", async (req, res, next) => {
  try {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const deleted = await deletePoiService(userId, req.params.poiId ?? "");
    if (!deleted) {
      const error: ApiError = { error: "poi not found" };
      res.status(404).json(error);
      return;
    }

    req.log.info("deleted POI", { poiId: req.params.poiId, userId });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
