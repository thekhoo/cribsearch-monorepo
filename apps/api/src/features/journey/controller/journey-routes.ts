import { Router } from "express";
import type {
  ApiError,
  JourneySearchRequest,
  JourneySearchResponse,
} from "@cribsearch/shared-types";
import { validateJourneyRequest } from "../service/validate-journey-request";
import { createJourneyRequest } from "../service/create-journey-request";
import { getJourneyRequest } from "../service/get-journey-request";
import { enqueueJourney } from "../../../shared/service/queue";

export const journeyRouter: Router = Router();

journeyRouter.post("/", async (req, res, next) => {
  try {
    const body = req.body as JourneySearchRequest;
    const validation = validateJourneyRequest(body);

    if (!validation.ok) {
      const error: ApiError = { error: validation.error };
      res.status(400).json(error);
      return;
    }

    const { id, status } = await createJourneyRequest(body);
    await enqueueJourney({ ...body, journeyRequestId: id });

    const response: JourneySearchResponse = { id, status };
    req.log.info("accepted journey request", { journeyRequestId: id });
    res.status(202).json(response);
  } catch (err) {
    next(err);
  }
});

journeyRouter.get("/:id", async (req, res, next) => {
  try {
    const view = await getJourneyRequest(req.params.id ?? "");

    if (!view) {
      const error: ApiError = { error: "Not Found" };
      res.status(404).json(error);
      return;
    }

    const response: JourneySearchResponse = {
      id: view.id,
      status: view.status,
      search: view.search,
      error: view.error,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
});
