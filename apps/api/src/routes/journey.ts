import { Router } from "express";
import type {
  ApiError,
  JourneySearchRequest,
  JourneySearchResponse,
} from "@cribsearch/shared-types";
import { validateJourneyRequest } from "../services/validate-journey-request";
import type { Ports } from "../composition";

export const createJourneyRouter = ({ repo, queue }: Ports): Router => {
  const router: Router = Router();

  router.post("/", async (req, res, next) => {
    try {
      const body = req.body as JourneySearchRequest;
      const validation = validateJourneyRequest(body);

      if (!validation.ok) {
        const error: ApiError = { error: validation.error };
        res.status(400).json(error);
        return;
      }

      const { id, status } = await repo.create(body);

      await queue.enqueue({
        ...body,
        journeyRequestId: id,
      });

      const response: JourneySearchResponse = { id, status };
      req.log.info("accepted journey request", { journeyRequestId: id });
      res.status(202).json(response);
    } catch (err) {
      next(err);
    }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const stored = await repo.getById(req.params.id);

      if (!stored) {
        const error: ApiError = { error: "Not Found" };
        res.status(404).json(error);
        return;
      }

      const response: JourneySearchResponse = {
        id: stored.id,
        status: stored.status,
        search: stored.search,
        error: stored.error,
      };
      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  return router;
};
