// Well-known Bengaluru congestion hotspots, used as starting points for proposals
// and as grounding context for the AI. Coordinates are approximate junction centres.

export interface Area {
  id: string;
  name: string;
  lat: number;
  lng: number;
  severity: 1 | 2 | 3; // 3 = chronic gridlock
  context: string;
}

export const AREAS: Area[] = [
  {
    id: "silk-board",
    name: "Silk Board Junction",
    lat: 12.9172,
    lng: 77.6229,
    severity: 3,
    context:
      "Meeting point of Hosur Road, Outer Ring Road and BTM/HSR roads. Existing flyover on Hosur Road, Namma Metro Yellow Line and ORR Blue Line interchange under construction. Notorious peak-hour gridlock.",
  },
  {
    id: "hebbal",
    name: "Hebbal Flyover",
    lat: 13.0358,
    lng: 77.597,
    severity: 3,
    context:
      "Gateway on Bellary Road (NH-44) towards the airport, meets Outer Ring Road. Multi-loop flyover with lane merging bottlenecks; next to Hebbal lake.",
  },
  {
    id: "kr-puram",
    name: "KR Puram / Tin Factory",
    lat: 12.9985,
    lng: 77.673,
    severity: 3,
    context:
      "Old Madras Road meets Outer Ring Road; KR Puram cable-stayed bridge and railway station, Purple Line metro and ORR Blue Line. Heavy bus and truck mix, pedestrian conflicts.",
  },
  {
    id: "marathahalli",
    name: "Marathahalli Bridge",
    lat: 12.9569,
    lng: 77.7011,
    severity: 3,
    context:
      "Outer Ring Road crossing Old Airport Road over the railway line. IT corridor traffic, narrow service roads, frequent waterlogging.",
  },
  {
    id: "bellandur",
    name: "ORR Bellandur",
    lat: 12.926,
    lng: 77.6762,
    severity: 3,
    context:
      "Outer Ring Road IT corridor between Agara and Sarjapur Road. Tech park traffic, ORR metro (Blue Line) construction, Bellandur lake flooding.",
  },
  {
    id: "whitefield",
    name: "Whitefield / ITPL",
    lat: 12.9868,
    lng: 77.7374,
    severity: 2,
    context:
      "ITPL Main Road and Whitefield Main Road. Purple Line metro extension now running; last-mile connectivity and narrow arterials are the issue.",
  },
  {
    id: "electronic-city",
    name: "Electronic City",
    lat: 12.8452,
    lng: 77.6602,
    severity: 2,
    context:
      "Elevated tollway on Hosur Road above the at-grade road. Yellow Line metro. Congestion at entry/exit ramps and Hosur Road service lanes.",
  },
  {
    id: "sony-world",
    name: "Koramangala Sony World",
    lat: 12.9366,
    lng: 77.6265,
    severity: 2,
    context:
      "Junction of 80 Feet Road and Intermediate Ring Road in Koramangala. Dense commercial area, an elevated corridor has been stalled for years.",
  },
  {
    id: "mg-road",
    name: "MG Road",
    lat: 12.9757,
    lng: 77.6061,
    severity: 1,
    context:
      "Central business district, Purple Line metro runs elevated above. One-way loops with Brigade Road and Church Street; high pedestrian volume.",
  },
  {
    id: "majestic",
    name: "Majestic",
    lat: 12.9767,
    lng: 77.5713,
    severity: 2,
    context:
      "Kempegowda Bus Station, KSR railway station and the Purple/Green metro interchange. Huge pedestrian and bus volumes.",
  },
  {
    id: "goraguntepalya",
    name: "Goraguntepalya / Yeshwanthpur",
    lat: 13.0285,
    lng: 77.5409,
    severity: 3,
    context:
      "Tumkur Road (NH-48) meets Outer Ring Road; Peenya elevated expressway and Green Line metro. Heavy freight traffic.",
  },
  {
    id: "dairy-circle",
    name: "Dairy Circle / Bannerghatta Rd",
    lat: 12.9387,
    lng: 77.601,
    severity: 2,
    context:
      "Bannerghatta Road and Hosur Road link. Pink Line metro under construction along Bannerghatta Road narrows the carriageway.",
  },
  {
    id: "sirsi-circle",
    name: "Mysore Road / Sirsi Circle",
    lat: 12.9578,
    lng: 77.5635,
    severity: 2,
    context:
      "Mysore Road flyover towards Sirsi Circle and City Market. Purple Line metro on Mysore Road. Congested market area.",
  },
  {
    id: "indiranagar",
    name: "Indiranagar 100 Ft Road",
    lat: 12.9719,
    lng: 77.6412,
    severity: 1,
    context:
      "Commercial arterial with heavy on-street parking, restaurants and pedestrian activity. Purple Line metro on the north end.",
  },
];

export const BENGALURU_CENTER = { lat: 12.9716, lng: 77.5946 };

export function findArea(id: string | null | undefined): Area | undefined {
  return AREAS.find((a) => a.id === id);
}
