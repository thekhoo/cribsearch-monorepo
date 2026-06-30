import type { Folder, Poi, Search } from "@cribsearch/shared-types";

export const SEED_POIS: Poi[] = [
  { id: "poi-1", label: "Work", address: "100 George St, Sydney NSW 2000" },
  { id: "poi-2", label: "Family", address: "42 Elm Ave, Burwood NSW 2134" },
  { id: "poi-3", label: "Gym", address: "5 Fitness Ln, Newtown NSW 2042" },
];

export const SEED_FOLDERS: Folder[] = [
  { id: "folder-1", name: "Inner West" },
  { id: "folder-2", name: "Round 2" },
];

export const SEED_SEARCHES: Search[] = [
  {
    id: "search-1",
    nickname: "Newtown Terrace",
    address: "18 King St, Newtown NSW 2042",
    modes: ["walk", "transit", "cycle"],
    amenityCategories: ["supermarket", "transit_stop", "park"],
    amenityGroups: [
      {
        category: "supermarket",
        destinations: [
          { id: "d-1", name: "Coles", address: "10 Main St", travelStats: [{ mode: "walk", seconds: 480, meters: 640 }, { mode: "transit", seconds: 300, meters: 400 }, { mode: "cycle", seconds: 240, meters: 320 }] },
          { id: "d-2", name: "Woolworths", address: "25 Main St", travelStats: [{ mode: "walk", seconds: 720, meters: 960 }, { mode: "transit", seconds: 420, meters: 560 }, { mode: "cycle", seconds: 360, meters: 480 }] },
          { id: "d-3", name: "Aldi", address: "40 Main St", travelStats: [{ mode: "walk", seconds: 1080, meters: 1440 }, { mode: "transit", seconds: 600, meters: 800 }, { mode: "cycle", seconds: 540, meters: 720 }] },
        ],
      },
      {
        category: "transit_stop",
        destinations: [
          { id: "d-4", name: "Newtown Station", address: "1 Station St", travelStats: [{ mode: "walk", seconds: 300, meters: 400 }, { mode: "transit", seconds: 180, meters: 240 }, { mode: "cycle", seconds: 120, meters: 160 }] },
          { id: "d-5", name: "St Peters Stop", address: "15 Station St", travelStats: [{ mode: "walk", seconds: 840, meters: 1120 }, { mode: "transit", seconds: 480, meters: 640 }, { mode: "cycle", seconds: 420, meters: 560 }] },
        ],
      },
      {
        category: "park",
        destinations: [
          { id: "d-6", name: "Camperdown Memorial Park", address: "5 Park St", travelStats: [{ mode: "walk", seconds: 600, meters: 800 }, { mode: "transit", seconds: 360, meters: 480 }, { mode: "cycle", seconds: 300, meters: 400 }] },
        ],
      },
    ],
    pois: [
      { poiId: "poi-1", label: "Work", address: "100 George St, Sydney NSW 2000", travelStats: [{ mode: "walk", seconds: 2100, meters: 2800 }, { mode: "transit", seconds: 1080, meters: 1440 }, { mode: "cycle", seconds: 900, meters: 1200 }] },
    ],
    folderId: "folder-1",
    createdAt: "2026-06-20T10:30:00.000Z",
  },
  {
    id: "search-2",
    address: "7 Booth St, Annandale NSW 2038",
    modes: ["walk", "drive"],
    amenityCategories: ["supermarket", "pharmacy"],
    amenityGroups: [
      {
        category: "supermarket",
        destinations: [
          { id: "d-7", name: "Coles", address: "12 Main St", travelStats: [{ mode: "walk", seconds: 900, meters: 1200 }, { mode: "drive", seconds: 240, meters: 320 }] },
          { id: "d-8", name: "Woolworths", address: "30 Main St", travelStats: [{ mode: "walk", seconds: 1200, meters: 1600 }, { mode: "drive", seconds: 360, meters: 480 }] },
        ],
      },
      {
        category: "pharmacy",
        destinations: [
          { id: "d-9", name: "Chemist Warehouse", address: "8 Main St", travelStats: [{ mode: "walk", seconds: 600, meters: 800 }, { mode: "drive", seconds: 180, meters: 240 }] },
          { id: "d-10", name: "Priceline Pharmacy", address: "22 Main St", travelStats: [{ mode: "walk", seconds: 960, meters: 1280 }, { mode: "drive", seconds: 300, meters: 400 }] },
        ],
      },
    ],
    pois: [
      { poiId: "poi-1", label: "Work", address: "100 George St, Sydney NSW 2000", travelStats: [{ mode: "walk", seconds: 2400, meters: 3200 }, { mode: "drive", seconds: 720, meters: 960 }] },
      { poiId: "poi-2", label: "Family", address: "42 Elm Ave, Burwood NSW 2134", travelStats: [{ mode: "walk", seconds: 3300, meters: 4400 }, { mode: "drive", seconds: 1080, meters: 1440 }] },
    ],
    folderId: "folder-1",
    createdAt: "2026-06-22T14:15:00.000Z",
  },
  {
    id: "search-3",
    nickname: "CBD Studio",
    address: "200 Pitt St, Sydney NSW 2000",
    modes: ["walk", "transit"],
    amenityCategories: ["supermarket", "transit_stop", "pharmacy", "park"],
    amenityGroups: [
      {
        category: "supermarket",
        destinations: [
          { id: "d-11", name: "Woolworths Metro", address: "180 Pitt St", travelStats: [{ mode: "walk", seconds: 180, meters: 240 }, { mode: "transit", seconds: 120, meters: 160 }] },
        ],
      },
      {
        category: "transit_stop",
        destinations: [
          { id: "d-12", name: "Town Hall Station", address: "George St", travelStats: [{ mode: "walk", seconds: 240, meters: 320 }, { mode: "transit", seconds: 120, meters: 160 }] },
        ],
      },
      {
        category: "pharmacy",
        destinations: [
          { id: "d-13", name: "Chemist Warehouse", address: "195 Pitt St", travelStats: [{ mode: "walk", seconds: 120, meters: 160 }, { mode: "transit", seconds: 120, meters: 160 }] },
        ],
      },
      {
        category: "park",
        destinations: [
          { id: "d-14", name: "Hyde Park", address: "Elizabeth St", travelStats: [{ mode: "walk", seconds: 360, meters: 480 }, { mode: "transit", seconds: 240, meters: 320 }] },
        ],
      },
    ],
    pois: [],
    createdAt: "2026-06-23T09:00:00.000Z",
  },
];
