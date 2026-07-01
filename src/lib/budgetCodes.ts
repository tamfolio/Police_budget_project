// Centralized NPF/GIFMIS budget code resolver.
// Short codes are the last 4 digits (plus optional letter suffix) of the
// full 8-digit GIFMIS code. The authoritative mapping below comes from
// NPF_Budget_Code_Mapping.csv. Unmapped short codes are still resolved
// by prepending "2202" and flagged so they can be reviewed manually.

export type ResolvedCode = {
  /** Full 8-digit (+suffix) GIFMIS code, e.g. "22020101" or "22020301(a)". */
  full: string;
  /** Short code (last 4 digits + optional suffix). */
  short: string;
  /** Human-readable expenditure item (when known). */
  name?: string;
  /** True when present in the authoritative CSV mapping. */
  isMapped: boolean;
};

// Source: NPF_Budget_Code_Mapping.csv (Short Code, Full Code, Expenditure Item)
const RAW: Array<[string, string, string]> = [
  ["0101", "22020101", "Local Travels and Transport – Training"],
  ["0102", "22020102", "Local Travels and Transport – Others"],
  ["0103", "22020103", "International Travels and Transport – Training"],
  ["0104", "22020104", "International Travels and Transport – Others"],
  ["0201", "22020201", "Electricity Charges"],
  ["0202", "22020202", "Telephone Charges"],
  ["0203", "22020203", "Internet Access Charges"],
  ["0204", "22020204", "Satellite Broadcasting Access Charges"],
  ["0205", "22020205", "Water Rates"],
  ["0206", "22020206", "Sewerage Charges"],
  ["0207", "22020207", "Leased Communication Line(s)"],
  ["0301(a)", "22020301(a)", "Stationery – Commands and Formations"],
  ["0301(b)", "22020301(b)", "Office and General"],
  ["0301(c)", "22020301(c)", "Foreign Peacekeeping Office"],
  ["0301(d)", "22020301(d)", "Force Computer Material and Supplies – DICT FHQ"],
  ["0301(e)", "22020301(e)", "Computer Material and Supplies – PAB"],
  ["0302(a)", "22020302(a)", "Books"],
  ["0303", "22020303", "Newspapers"],
  ["0305", "22020305", "Printing of Non-Security Documents"],
  ["0306", "22020306", "Printing of Security Documents"],
  ["0307(a)", "22020307(a)", "Drugs and Medical Supplies (NPMS)"],
  ["0307(b)", "22020307(b)", "Force Veterinary Services"],
  ["0308(a)", "22020308(a)", "Field and Camping Materials Supplies"],
  ["0308(b)", "22020308(b)", "Cobbler Equipment and Saddleries for Mounted Troop"],
  ["0309", "22020309", "Uniforms and Other Clothing"],
  ["0310(a)", "22020310(a)", "Teaching Aids to Police Colleges"],
  ["0311(a)", "22020311(a)", "Emergency Ration"],
  ["0311(b)", "22020311(b)", "Feeding of Detainees"],
  ["0311(c)", "22020311(c)", "Feeding of Patients"],
  ["0311(d)", "22020311(d)", "Feeding of FHQ Abuja Guards"],
  ["0401", "22020401", "Maintenance of Motor Vehicles and Transport Equipment"],
  ["0402", "22020402", "Maintenance of Office Furniture"],
  ["0403", "22020403", "Maintenance of Office Buildings and Residential Quarters"],
  ["0404(a)", "22020404(a)", "Maintenance of Office Equipment"],
  ["0404(b)", "22020404(b)", "Maintenance of IT Equipment"],
  ["0405", "22020405", "Maintenance of Plants and Generators"],
  ["0406(a)", "22020406(a)", "Maintenance of Communications Equipment"],
  ["0406(b)", "22020406(b)", "Maintenance of Bomb Disposal Equipment and Demolition Stores"],
  ["0406(c)", "22020406(c)", "Maintenance of Electrical Appliances Refrigerators and Air Conditioners"],
  ["0406(e)", "22020406(e)", "Maintenance of Police Band and Musical Equipment"],
  ["0406(j)", "22020406(j)", "Maintenance of Horses"],
  ["0406(k)", "22020406(k)", "Maintenance of Dogs"],
  ["0406(l)", "22020406(l)", "Maintenance of Arms Ammunition and Riot Control Equipment"],
  ["0406(m)", "22020406(m)", "Maintenance of Armoury and Ranges"],
  ["0406(n)", "22020406(n)", "Maintenance of Hospital Equipment"],
  ["0407", "22020407", "Maintenance of Aircraft"],
  ["0408", "22020408", "Maintenance of Sea Boats"],
  ["0501(a)", "22020501(a)", "Local Training"],
  ["0501(b)", "22020501(b)", "Conferences and Workshops"],
  ["0502", "22020502", "International Training"],
  ["0601", "22020601", "Security Services"],
  ["0603", "22020603", "Office Rent"],
  ["0605", "22020605", "Security Vote (Including Operations)"],
  ["0606(a)", "22020606(a)", "Cleaning and Gardening Equipment – Provost FHQ Abuja"],
  ["0606(b)", "22020606(b)", "Cleaning and Gardening Equipment – Provost FHQ Annex Lagos"],
  ["0801", "22020801", "Motor Vehicle Fuel Cost"],
  ["0803", "22020803", "Plant and Generator Fuel Cost"],
  ["0804", "22020804", "Aircraft Fuel Cost"],
  ["0805", "22020805", "Sea Boat Fuel Cost"],
  ["0901", "22020901", "Bank Charges"],
  ["0902(a)", "22020902(a)", "Group Personal Accident Cover"],
  ["0902(b)", "22020902(b)", "Insurance of Nigeria Police Airfleet"],
  ["0902(c)", "22020902(c)", "Insurance of Police Buildings and HQS"],
  ["0902(d)", "22020902(d)", "Insurance of Police Marine Boats"],
  ["0902(e)", "22020902(e)", "Insurance of Police Animals"],
  ["1001", "22021001", "Refreshment and Meals"],
  ["1002", "22021002", "Honourarium and Sitting Allowances"],
  ["1003(a)", "22021003(a)", "Public Enlightenment Through Audio Visuals"],
  ["1003(b)", "22021003(b)", "Force and Media"],
  ["1003(c)", "22021003(c)", "Public Information and Publicity"],
  ["1004", "22021004", "Medical Expenditure"],
  ["1006", "22021006", "Postages and Courier Services"],
  ["1007", "22021007", "Welfare Packages (Burial Expenses)"],
  ["1009", "22021009", "Sporting Activities"],
  ["1014", "22021014", "Annual Budget Expenses and Administration"],
  ["1020", "22021020", "Election – Logistics Support"],
];

const SHORT_TO_FULL = new Map<string, { full: string; name: string }>();
const FULL_TO_NAME = new Map<string, string>();
for (const [s, f, n] of RAW) {
  SHORT_TO_FULL.set(s, { full: f, name: n });
  FULL_TO_NAME.set(f, n);
}

// Matches a 4-digit code with an optional single-letter parenthesised suffix.
const SHORT_RE = /^(\d{4})(\([a-z]\))?$/i;
const FULL_RE = /^(\d{8})(\([a-z]\))?$/i;

/**
 * Resolve any budget-code input to its canonical full 8-digit GIFMIS form.
 *
 * - Short codes (e.g. "0801", "0301(a)") are mapped via the CSV.
 * - Unmapped short codes get "2202" prepended automatically and isMapped=false
 *   so they can be visually flagged for manual review.
 * - Full codes are returned as-is.
 */
export function resolveBudgetCode(input: string | null | undefined): ResolvedCode {
  const raw = (input ?? "").trim();
  if (!raw) return { full: "", short: "", isMapped: false };

  const mShort = SHORT_RE.exec(raw);
  if (mShort) {
    const hit = SHORT_TO_FULL.get(raw);
    if (hit) return { full: hit.full, short: raw, name: hit.name, isMapped: true };
    // Auto-prepend 2202 for unmapped short codes.
    const full = `2202${raw}`;
    return { full, short: raw, isMapped: false };
  }

  const mFull = FULL_RE.exec(raw);
  if (mFull) {
    const short = raw.slice(4);
    const name = FULL_TO_NAME.get(raw);
    return { full: raw, short, name, isMapped: !!name || raw.startsWith("2202") };
  }

  // Unknown shape — pass through unchanged, mark unmapped.
  return { full: raw, short: raw, isMapped: false };
}

/** Convenience: just the canonical full code string. */
export const toFullCode = (input: string | null | undefined): string =>
  resolveBudgetCode(input).full;

/** Display name when known (from CSV); empty otherwise. */
export const codeName = (input: string | null | undefined): string =>
  resolveBudgetCode(input).name ?? "";