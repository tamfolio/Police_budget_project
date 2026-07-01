// States by Geopolitical Zone
export const ZONES: Record<string, string[]> = {
  'North Central': ['Benue', 'Kogi', 'Kwara', 'Nasarawa', 'Niger', 'Plateau', 'FCT Abuja'],
  'North East': ['Adamawa', 'Bauchi', 'Borno', 'Gombe', 'Taraba', 'Yobe'],
  'North West': ['Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Sokoto', 'Zamfara'],
  'South East': ['Abia', 'Anambra', 'Ebonyi', 'Enugu', 'Imo'],
  'South South': ['Akwa Ibom', 'Bayelsa', 'Cross River', 'Delta', 'Edo', 'Rivers'],
  'South West': ['Ekiti', 'Lagos', 'Ogun', 'Ondo', 'Osun', 'Oyo'],
};

export const ALL_STATES = Object.values(ZONES).flat().sort();
export const ZONE_NAMES = Object.keys(ZONES);

export const FISCAL_YEARS = [2026];

export const BUDGET_CATEGORIES: Record<string, string[]> = {
  'Personnel': ['Salaries', 'Pensions', 'Allowances', 'Hazard Pay', 'Overtime'],
  'Operations & Logistics': ['Fuel & Fleet', 'Office Running', 'ICT Services', 'Utilities', 'Consumables', 'Uniforms'],
  'Infrastructure & Assets': ['Police Stations', 'Barracks', 'Training Colleges', 'Clinics', 'Land Acquisition'],
  'Equipment & Technology': ['Vehicles', 'Communications', 'Computers', 'Forensic Kits', 'Weaponry & Ammunition', 'Protective Gear'],
  'Training & Capacity': ['Academy Courses', 'Workshops', 'Police Colleges', 'International Training'],
  'Welfare & Community Policing': ['Health Fund', 'Housing Allowances', 'Community Outreach', 'Officer Insurance'],
  'Oversight & Compliance': ['Audit Activities', 'Fraud Investigations', 'Inspectorate', 'Monitoring'],
  'Grants & Donor Funds': ['UN Programmes', 'EU Funds', 'Bilateral Aid', 'World Bank'],
  'NPTF Allocations': ['NPTF Personnel', 'NPTF Capital', 'NPTF Training', 'NPTF Welfare'],
};

export const CATEGORY_NAMES = Object.keys(BUDGET_CATEGORIES);
export const ALL_SUB_CATEGORIES = Object.values(BUDGET_CATEGORIES).flat();

export const DEPARTMENTS = [
  'Force Headquarters', 'Force CID', 'Force Intelligence Bureau', 'DICT',
  'Counter Terrorism Unit', 'Special Protection Unit', 'Community Policing',
  'Research & Planning', 'Interpol', 'Maritime Police', 'Force Transport',
  'Police Academy Wudil', 'Police Staff College Jos', 'Training Institutions',
  'Directorate of Finance & Admin', 'Force Secretary', 'Legal',
];

export const RANKS = [
  'Constable', 'Corporal', 'Sergeant', 'Inspector', 'ASP', 'DSP', 'SP',
  'CSP', 'ACP', 'DCP', 'CP', 'AIG', 'DIG', 'IGP',
];

export const KPI_DEFINITIONS = [
  { id: 'utilisation', label: 'Budget Utilisation Rate', unit: '%' },
  { id: 'release_rate', label: 'Release vs Appropriation', unit: '%' },
  { id: 'commitment_rate', label: 'Commitment Rate', unit: '%' },
  { id: 'capex_exec', label: 'Capital Execution Rate', unit: '%' },
  { id: 'personnel_ratio', label: 'Personnel to Total Ratio', unit: '%' },
  { id: 'crime_clearance', label: 'Crime Clearance Rate', unit: '%' },
  { id: 'response_time', label: 'Avg Response Time', unit: 'mins' },
  { id: 'vacancy_rate', label: 'Vacancy Rate', unit: '%' },
  { id: 'training_completion', label: 'Training Completion Rate', unit: '%' },
  { id: 'audit_compliance', label: 'Audit Compliance Score', unit: '%' },
];

export const OFFENCE_TYPES = [
  'Armed Robbery', 'Burglary', 'Kidnapping', 'Murder', 'Assault',
  'Fraud', 'Cybercrime', 'Drug Offences', 'Traffic', 'Domestic Violence', 'Other',
];

export const DONORS = [
  'World Bank', 'FCDO (UK)', 'GIZ (Germany)', 'EU Delegation', 'UNODC',
  'UNDP', 'US Embassy', 'MCC', 'AfDB', 'Japan (JICA)', 'Other',
];

export const FOCUS_AREAS = [
  'Training', 'Equipment', 'Counter-terrorism', 'Community Policing',
  'Forensics', 'Digital Infrastructure', 'Justice Reform', 'Other',
];

export const PROJECT_TYPES = [
  'Infrastructure', 'Equipment', 'Technology', 'Training Facility',
  'Barracks', 'Police Station', 'Vehicle Fleet', 'Other',
];

export const PROCUREMENT_METHODS = [
  'Open Competitive', 'Selective', 'Direct', 'Framework Contract', 'Emergency',
];

export const PROCUREMENT_STAGES = [
  'Planned', 'Tendered', 'Evaluated', 'Awarded', 'In Progress', 'Delivered', 'Paid', 'Closed',
];

export const FINDING_TYPES = [
  'Irregularity', 'Non-compliance', 'Abandoned Project', 'Unapproved Payment',
  'Ghost Worker', 'Budget Deviation', 'Procurement Breach', 'Other',
];

export const SEVERITY_LEVELS = ['Critical', 'High', 'Medium', 'Low'];
export const AUDIT_STATUSES = ['Open', 'Under Investigation', 'Resolved', 'Escalated', 'Closed'];
export const PERSONNEL_STATUSES = ['Active', 'Retired', 'Deceased', 'Dismissed', 'Seconded'];
export const CADRES = ['Junior', 'Senior', 'Management'];
export const PROJECT_STATUSES = ['Planning', 'In Progress', 'Completed', 'Abandoned', 'On Hold'];
export const COMMITMENT_STATUSES = ['Planned', 'Tendered', 'Awarded', 'Delivered', 'Paid'];
export const GRANT_STATUSES = ['Active', 'Completed', 'Pipeline', 'Suspended'];
export const CURRENCIES = ['NGN', 'USD', 'EUR', 'GBP'];
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// NPF Police Zones (1–17) — used by Distributions and Dashboard filters.
export const NPF_ZONES: { id: number; label: string }[] = [
  { id: 1,  label: 'Zone 1 — Kano' },
  { id: 2,  label: 'Zone 2 — Lagos' },
  { id: 3,  label: 'Zone 3 — Yola' },
  { id: 4,  label: 'Zone 4 — Makurdi' },
  { id: 5,  label: 'Zone 5 — Benin' },
  { id: 6,  label: 'Zone 6 — Calabar' },
  { id: 7,  label: 'Zone 7 — Abuja' },
  { id: 8,  label: 'Zone 8 — Lokoja' },
  { id: 9,  label: 'Zone 9 — Umuahia' },
  { id: 10, label: 'Zone 10 — Sokoto' },
  { id: 11, label: 'Zone 11 — Osogbo' },
  { id: 12, label: 'Zone 12 — Bauchi' },
  { id: 13, label: 'Zone 13 — Dunukofia' },
  { id: 14, label: 'Zone 14 — Katsina' },
  { id: 15, label: 'Zone 15 — Maiduguri' },
  { id: 16, label: 'Zone 16 — Yenagoa' },
  { id: 17, label: 'Zone 17 — Akure' },
];

export const getZoneForState = (state: string): string => {
  for (const [zone, states] of Object.entries(ZONES)) {
    if (states.includes(state)) return zone;
  }
  return '';
};

export const formatNaira = (amount: number): string => {
  if (amount >= 1e12) return `₦${new Intl.NumberFormat("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount / 1e12)}T`;
  if (amount >= 1e9) return `₦${new Intl.NumberFormat("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount / 1e9)}B`;
  if (amount >= 1e6) return `₦${new Intl.NumberFormat("en-NG", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(amount / 1e6)}M`;
  if (amount >= 1e3) return `₦${new Intl.NumberFormat("en-NG", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(amount / 1e3)}K`;
  return `₦${amount.toLocaleString()}`;
};
