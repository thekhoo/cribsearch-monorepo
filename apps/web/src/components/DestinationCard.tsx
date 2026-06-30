import type { TravelStat } from "@cribsearch/shared-types";
import { MODE_META, formatDuration, formatDistance } from "../lib/format";

interface DestinationCardProps {
  name: string;
  address?: string;
  travelStats: TravelStat[];
}

export default function DestinationCard({
  name,
  address,
  travelStats,
}: DestinationCardProps) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 bg-white px-4 py-3">
      <div className="min-w-0">
        <p className="font-medium text-gray-900">{name}</p>
        {address && (
          <p className="truncate text-sm text-gray-500">{address}</p>
        )}
      </div>
      <div className="flex shrink-0 gap-3">
        {travelStats.map((stat) => (
          <span
            key={stat.mode}
            className="flex items-center gap-1 text-sm text-gray-600"
            title={MODE_META[stat.mode].label}
          >
            <span>{MODE_META[stat.mode].icon}</span>
            <span>{formatDuration(stat.seconds)} · <span className="text-gray-400">{formatDistance(stat.meters)}</span></span>
          </span>
        ))}
      </div>
    </div>
  );
}
