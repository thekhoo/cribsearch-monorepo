import type { Search } from "@homefinder/shared-types";
import { CATEGORY_META } from "../lib/format";
import DestinationCard from "./DestinationCard";

interface ResultsViewProps {
  search: Search;
}

export default function ResultsView({ search }: ResultsViewProps) {
  return (
    <div className="space-y-6">
      {search.amenityGroups.map((group) => (
        <section key={group.category}>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
            {CATEGORY_META[group.category].label}
          </h3>
          <div className="space-y-2">
            {group.destinations.map((dest) => (
              <DestinationCard
                key={dest.id}
                name={dest.name}
                address={dest.address}
                travelStats={dest.travelStats}
              />
            ))}
          </div>
        </section>
      ))}
      {search.pois.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Your POIs
          </h3>
          <div className="space-y-2">
            {search.pois.map((poi) => (
              <DestinationCard
                key={poi.poiId}
                name={poi.label}
                address={poi.address}
                travelStats={poi.travelStats}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
