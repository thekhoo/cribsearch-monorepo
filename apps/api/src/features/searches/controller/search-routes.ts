import { Router } from "express";
import type {
  ApiError,
  SearchRequest,
  SearchResponse,
} from "@cribsearch/shared-types";
import { validateSearchRequest } from "../service/validate-search-request";
import { createSearchRequest } from "../service/create-search-request";
import { getSearchRequest } from "../service/get-search-request";
import { enqueueSearch } from "../../../shared/service/queue";
import { requireUserId } from "../../../shared/http/require-user-id";

export const searchRouter: Router = Router();

searchRouter.post("/", async (req, res, next) => {
  try {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const body = req.body as SearchRequest;
    const validation = validateSearchRequest(body);

    if (!validation.ok) {
      const error: ApiError = { error: validation.error };
      res.status(400).json(error);
      return;
    }

    const { id, status } = await createSearchRequest(userId, body);
    await enqueueSearch({ ...body, searchRequestId: id });

    const response: SearchResponse = { id, status };
    req.log.info("accepted search request", { searchRequestId: id });
    res.status(202).json(response);
  } catch (err) {
    next(err);
  }
});

searchRouter.get("/:id", async (req, res, next) => {
  try {
    const view = await getSearchRequest(req.params.id ?? "");

    if (!view) {
      const error: ApiError = { error: "Not Found" };
      res.status(404).json(error);
      return;
    }

    const response: SearchResponse = {
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
