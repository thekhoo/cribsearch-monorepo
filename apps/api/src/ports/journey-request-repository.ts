import type {
  JourneySearchRequest,
  RequestStatus,
  Search,
} from "@cribsearch/shared-types";

export interface StoredJourneyRequest {
  id: string;
  status: RequestStatus;
  request: JourneySearchRequest;
  search?: Search;
  error?: string;
}

export interface JourneyRequestRepository {
  create(req: JourneySearchRequest): Promise<{ id: string; status: "Pending" }>;
  getById(id: string): Promise<StoredJourneyRequest | null>;
  markProcessing(id: string): Promise<void>;
  saveResult(
    id: string,
    status: "Complete" | "PartialFailure" | "Failed",
    search?: Search,
    error?: string,
  ): Promise<void>;
}
