import { Router } from "express";
import type { ApiResponse, Property } from "@cribsearch/shared-types";
import { listProperties } from "../services/property-service";

export const propertiesRouter: Router = Router();

propertiesRouter.get("/", async (_req, res, next) => {
  try {
    const properties = await listProperties();
    const body: ApiResponse<Property[]> = { data: properties };
    res.json(body);
  } catch (err) {
    next(err);
  }
});
