import type { Search } from "@cribsearch/shared-types";
import { CATEGORY_META } from "../lib/format";
import DestinationCard from "./DestinationCard";

interface ResultsViewProps {
  search: Search;
}

export default function ResultsView({ search }: ResultsViewProps) {
  const hasPois = search.pois.length > 0;
  const hasAmenities = search.amenityGroups.length > 0;

  return (
    <div className="space-y-8">
      {/* Places of Interest — declared by you */}
      {hasPois && (
        <section>
          <div className="mb-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
              Places of Interest
            </h3>
            <p className="text-xs text-gray-500">Places you told us matter</p>
          </div>
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

      {hasPois && hasAmenities && <hr className="border-gray-200" />}

      {/* Amenities — found for you */}
      {hasAmenities && (
        <section>
          <div className="mb-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
              Amenities
            </h3>
            <p className="text-xs text-gray-500">Nearby places we found for you</p>
          </div>
          <div className="space-y-6">
            {search.amenityGroups.map((group) => (
              <div key={group.category}>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {CATEGORY_META[group.category].label}
                </h4>
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
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
