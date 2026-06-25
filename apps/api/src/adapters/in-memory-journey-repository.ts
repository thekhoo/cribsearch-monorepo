import type { JourneySearchRequest, Search } from "@homefinder/shared-types";
import type {
  JourneyRequestRepository,
  StoredJourneyRequest,
} from "../ports/journey-request-repository";

export class InMemoryJourneyRepository implements JourneyRequestRepository {
  private readonly store = new Map<string, StoredJourneyRequest>();
  private nextId = 1;

  async create(
    req: JourneySearchRequest,
  ): Promise<{ id: string; status: "Pending" }> {
    const id = `jr-${String(this.nextId++)}`;
    this.store.set(id, { id, status: "Pending", request: req });
    return { id, status: "Pending" };
  }

  async getById(id: string): Promise<StoredJourneyRequest | null> {
    return this.store.get(id) ?? null;
  }

  async markProcessing(id: string): Promise<void> {
    const entry = this.store.get(id);
    if (entry) {
      entry.status = "Processing";
    }
  }

  async saveResult(
    id: string,
    status: "Complete" | "PartialFailure" | "Failed",
    search?: Search,
    error?: string,
  ): Promise<void> {
    const entry = this.store.get(id);
    if (entry) {
      entry.status = status;
      entry.search = search;
      entry.error = error;
    }
  }
}
