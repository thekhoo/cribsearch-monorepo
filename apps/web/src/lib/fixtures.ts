import type { Folder, Poi, Search } from "@homefinder/shared-types";

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
          { id: "d-1", name: "Coles", address: "10 Main St", travelStats: [{ mode: "walk", minutes: 8 }, { mode: "transit", minutes: 5 }, { mode: "cycle", minutes: 4 }] },
          { id: "d-2", name: "Woolworths", address: "25 Main St", travelStats: [{ mode: "walk", minutes: 12 }, { mode: "transit", minutes: 7 }, { mode: "cycle", minutes: 6 }] },
          { id: "d-3", name: "Aldi", address: "40 Main St", travelStats: [{ mode: "walk", minutes: 18 }, { mode: "transit", minutes: 10 }, { mode: "cycle", minutes: 9 }] },
        ],
      },
      {
        category: "transit_stop",
        destinations: [
          { id: "d-4", name: "Newtown Station", address: "1 Station St", travelStats: [{ mode: "walk", minutes: 5 }, { mode: "transit", minutes: 3 }, { mode: "cycle", minutes: 2 }] },
          { id: "d-5", name: "St Peters Stop", address: "15 Station St", travelStats: [{ mode: "walk", minutes: 14 }, { mode: "transit", minutes: 8 }, { mode: "cycle", minutes: 7 }] },
        ],
      },
      {
        category: "park",
        destinations: [
          { id: "d-6", name: "Camperdown Memorial Park", address: "5 Park St", travelStats: [{ mode: "walk", minutes: 10 }, { mode: "transit", minutes: 6 }, { mode: "cycle", minutes: 5 }] },
        ],
      },
    ],
    pois: [
      { poiId: "poi-1", label: "Work", address: "100 George St, Sydney NSW 2000", travelStats: [{ mode: "walk", minutes: 35 }, { mode: "transit", minutes: 18 }, { mode: "cycle", minutes: 15 }] },
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
          { id: "d-7", name: "Coles", address: "12 Main St", travelStats: [{ mode: "walk", minutes: 15 }, { mode: "drive", minutes: 4 }] },
          { id: "d-8", name: "Woolworths", address: "30 Main St", travelStats: [{ mode: "walk", minutes: 20 }, { mode: "drive", minutes: 6 }] },
        ],
      },
      {
        category: "pharmacy",
        destinations: [
          { id: "d-9", name: "Chemist Warehouse", address: "8 Main St", travelStats: [{ mode: "walk", minutes: 10 }, { mode: "drive", minutes: 3 }] },
          { id: "d-10", name: "Priceline Pharmacy", address: "22 Main St", travelStats: [{ mode: "walk", minutes: 16 }, { mode: "drive", minutes: 5 }] },
        ],
      },
    ],
    pois: [
      { poiId: "poi-1", label: "Work", address: "100 George St, Sydney NSW 2000", travelStats: [{ mode: "walk", minutes: 40 }, { mode: "drive", minutes: 12 }] },
      { poiId: "poi-2", label: "Family", address: "42 Elm Ave, Burwood NSW 2134", travelStats: [{ mode: "walk", minutes: 55 }, { mode: "drive", minutes: 18 }] },
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
          { id: "d-11", name: "Woolworths Metro", address: "180 Pitt St", travelStats: [{ mode: "walk", minutes: 3 }, { mode: "transit", minutes: 2 }] },
        ],
      },
      {
        category: "transit_stop",
        destinations: [
          { id: "d-12", name: "Town Hall Station", address: "George St", travelStats: [{ mode: "walk", minutes: 4 }, { mode: "transit", minutes: 2 }] },
        ],
      },
      {
        category: "pharmacy",
        destinations: [
          { id: "d-13", name: "Chemist Warehouse", address: "195 Pitt St", travelStats: [{ mode: "walk", minutes: 2 }, { mode: "transit", minutes: 2 }] },
        ],
      },
      {
        category: "park",
        destinations: [
          { id: "d-14", name: "Hyde Park", address: "Elizabeth St", travelStats: [{ mode: "walk", minutes: 6 }, { mode: "transit", minutes: 4 }] },
        ],
      },
    ],
    pois: [],
    createdAt: "2026-06-23T09:00:00.000Z",
  },
];
