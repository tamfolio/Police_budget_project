// Group a flat list of formations (as stored in distributionBreakdown.ts)
// into ordered per-zone buckets. Each "AIG ZONE N …" formation marks the
// start of a new zone; every formation after it (until the next AIG ZONE)
// belongs to that zone. Formations that appear before any AIG ZONE marker
// fall under zone 0 (Unassigned).
export type ZonedFormations<T extends { name: string }> = {
  zoneNumber: number;
  zoneLabel: string;
  formations: T[];
};

const ZONE_RE = /AIG\s+ZONE\s+(\d+)\b/i;

export function groupByZone<T extends { name: string }>(forms: T[]): ZonedFormations<T>[] {
  const out: ZonedFormations<T>[] = [];
  let current: ZonedFormations<T> | null = null;
  for (const f of forms) {
    const m = f.name.match(ZONE_RE);
    if (m) {
      // Use formation name as the zone label (e.g. "AIG ZONE 1 HEADQUARTERS KANO")
      current = { zoneNumber: Number(m[1]), zoneLabel: f.name.trim(), formations: [f] };
      out.push(current);
    } else {
      if (!current) {
        current = { zoneNumber: 0, zoneLabel: "Unassigned", formations: [] };
        out.push(current);
      }
      current.formations.push(f);
    }
  }
  return out;
}