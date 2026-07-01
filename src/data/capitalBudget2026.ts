// 2026 Appropriation Act — Federal Ministry of Police Affairs (Code: 0155001001)
// & Police Formations and Commands (Code: 0155004001)
// Capital Budget projects. Sourced from the 2026 Appropriation Act.
// This dataset is intentionally kept separate from the operational Account & Budget records.

export type CapitalBudgetType = "ONGOING" | "COMPLETED" | "CANCELLED";

export interface CapitalBudgetItem {
  ergp: string;
  name: string;
  type: CapitalBudgetType;
  amount: number;       // Naira
  page: number | null;  // Page reference in the Appropriation Act
}

export const CAPITAL_BUDGET_FY = 2026;
export const CAPITAL_BUDGET_MDAS = [
  { code: "0155001001", name: "Federal Ministry of Police Affairs" },
  { code: "0155004001", name: "Police Formations and Commands" },
];

export const CAPITAL_BUDGET_2026: CapitalBudgetItem[] = [
  {
    "ergp": "ERGP14192062",
    "name": "Supply, installation and training; questioned document and handwriting analysis Cellebrite and mobile forensic laboratory equipment and software to FCID, FCT Command and 36 State Command",
    "type": "ONGOING",
    "amount": 275181783,
    "page": 335
  },
  {
    "ergp": "ERGP14192064",
    "name": "Construction of five (5) No. of Inspector Qtrs at PMF 65 Mubi, construction of 8-man R/F Qtrs at PMF 65 Mubi, construction of 1 No. Clinic at PMF 65 Mubi, construction of 1 No. Borehole at Michika Division with Overhead Tank, Generator and Generator House, construction of 2 No. Inspectors Qtrs and 2 No. 8-man R/F Qtrs at Michika Police Barracks. Modern Police Station (storey type). Construction of 4-man Rank and File Quarters Storey 4 Borehole (solar powered) installation of stanchion for 800 litres overhead water tanks and blockwall perimeter fence Oyan Odo Otin LGA Osun",
    "type": "ONGOING",
    "amount": 285285834,
    "page": 335
  },
  {
    "ergp": "ERGP14192224",
    "name": "Construction of VIP toilets and football pitch in Police Children School Erin-Ile including construction of Police Children School Ogbadibo, Benue State (₦200,000,000.00) Police Children School Ozalla Nkanu West LGA Enugu State (₦107,523,521.00)",
    "type": "ONGOING",
    "amount": 218587731,
    "page": 335
  },
  {
    "ergp": "ERGP14192226",
    "name": "Police Capacity Building on Anti Terrorism/Anti Kidnapping/Anti Banditry",
    "type": "ONGOING",
    "amount": 259350758,
    "page": 335
  },
  {
    "ergp": "ERGP14192263",
    "name": "Construction of Police 5 No. Police Outposts at Marke, Kaugama, Garin Gabas, Girbobo and Makadare MMR/KGM Federal Constituency Jigawa State",
    "type": "ONGOING",
    "amount": 871425241,
    "page": 335
  },
  {
    "ergp": "ERGP14192265",
    "name": "Provision of hospital equipment, furnishing & accessories for NPF Specialized Hospital, Alokomi, Maiduguri. ₦467,786,130.03, Completion of NPF Hospital at Resource Centre Jabi ₦500,000,000.00",
    "type": "ONGOING",
    "amount": 677450291,
    "page": 336
  },
  {
    "ergp": "ERGP14197914",
    "name": "Construction of Modern Police Training School, Parade Ground, Hostels, Commandant Quarters and Staff Quarters at Ifewara Atakunmosa East LGA Osun State",
    "type": "ONGOING",
    "amount": 1149968527,
    "page": 336
  },
  {
    "ergp": "ERGP14206562",
    "name": "Upgrade/Modernization of Police Mechanical Workshops and Fuel Dumps in States and FCT Commands",
    "type": "ONGOING",
    "amount": 518701518,
    "page": 336
  },
  {
    "ergp": "ERGP14206656",
    "name": "Provision of Police Secondary School, Bende, Abia State and Rehabilitation/Reconstruction of damaged Police Divisions in selected areas in the South East",
    "type": "ONGOING",
    "amount": 1002511711,
    "page": 336
  },
  {
    "ergp": "ERGP14231629",
    "name": "Provision of infrastructure at the permanent site of newly established No. 80 Police Mobile Force Squadron Odugbo Apa LGA Benue State",
    "type": "ONGOING",
    "amount": 355400020,
    "page": 336
  },
  {
    "ergp": "ERGP14231636",
    "name": "Procurement and installation of video security surveillance system, provision of automation E-PABX intercom including console equipment, solar power back up system in all police state command nationwide (₦150,000,000.00) supply of communication workshop equipment and tools nationwide (₦150,000,000.00)",
    "type": "ONGOING",
    "amount": 213240012,
    "page": 336
  },
  {
    "ergp": "ERGP14231638",
    "name": "Procurement of equipment and tools for Police Campaign Against Cultism and other Vices Unit (POCACOV) in each geo-political zone for effective prevention of cultism activities nationwide",
    "type": "ONGOING",
    "amount": 73923204,
    "page": 336
  },
  {
    "ergp": "ERGP14231644",
    "name": "Construction, fencing and equipping of a modern, solar powered Divisional Police Headquarters at Auyo LGA Jigawa State (₦250,000,000.00). Construction of SPU Training School at Kafinhausa, Jigawa (₦350,000,000.00). Construction/fencing of a modern, solar powered Divisional Police Headquarters at Gwadangaji LGA, Birnin Kebbi State (₦150,000,000.00)",
    "type": "ONGOING",
    "amount": 533100030,
    "page": 336
  },
  {
    "ergp": "ERGP14231647",
    "name": "Digitalization of Police Accounts and Budget (PAB)",
    "type": "ONGOING",
    "amount": 355400020,
    "page": 336
  },
  {
    "ergp": "ERGP14234126",
    "name": "Construction, fencing and furnishing of Standard Police Primary School Administrative Block in Malam Madori LGA, Jigawa State (₦850,000,000.00). Construction of modern Police Station and SPO's, Rank & File Quarters with solar powered bore hole, security light with fencing in Malam Madori and Kaugama LGA Jigawa State (₦850,000,000.00)",
    "type": "ONGOING",
    "amount": 1190000000,
    "page": 336
  },
  {
    "ergp": "ERGP14234127",
    "name": "Construction of Area Command Headquarters at Asaba, Delta State (₦100,000,000.00). Construction of Police Station at Isseleuku, Akwukwo Igbo, Obiaruku, Ashaka, Umunede and Abavo all in Delta State (₦400,000,000.00)",
    "type": "ONGOING",
    "amount": 350000000,
    "page": 336
  },
  {
    "ergp": "ERGP14234128",
    "name": "Construction of office accommodation at Ogwashi Uku Area Command, Kwale Area Command, and Police Divisional Headquarters Delta State (₦300,000,000.00). Construction of 20 No. 4-man Rank & File Barracks, Asaba Delta State (₦200,000,000.00)",
    "type": "ONGOING",
    "amount": 350000000,
    "page": 336
  },
  {
    "ergp": "ERGP14240425",
    "name": "Provision of Security Vehicle in North Central Zone",
    "type": "ONGOING",
    "amount": 77805228,
    "page": 336
  },
  {
    "ergp": "ERGP14240483",
    "name": "Construction of Forward Operating Base for Police Special Forces Wawa District, Airport Road Abuja ₦200,000,000.00. Construction of 1 No DPOS Qtrs 4-bedroom for Divisional Police Officers Qtrs at Dakaiyawa, Kaugama LGA of MMR/KGM Fed. ₦200,000,000.00. Ongoing completion and furnishing of Police Station in Danbusha, Kaduna State ₦209,207,075.41",
    "type": "ONGOING",
    "amount": 426444953,
    "page": 337
  },
  {
    "ergp": "ERGP14240490",
    "name": "Construction in Erinjar fencing, completion of Staff Qtrs asphalt, drainages, sports pavillion parade ground & solar street lights ₦7,000,000,000.00. Male hostels, female hostels clinic ₦3,654,286,277.66",
    "type": "ONGOING",
    "amount": 7108000395,
    "page": 337
  },
  {
    "ergp": "ERGP14240504",
    "name": "Construction of Police Barracks & Accommodation in Bayelsa West LGA, Bayelsa State ₦200,000,000.00. Provision of solar powered borehole in Cross Rivers North ₦150,000,000.00. Construction of housing unit Ningi, Bauchi State ₦200,000,000.00",
    "type": "ONGOING",
    "amount": 385000000,
    "page": 337
  },
  {
    "ergp": "ERGP14240516",
    "name": "Rehabilitation, construction & supplies in Bauchi/Taraba/Jigawa/Kano/Anambra/Benue/Adamawa/Kaduna across their Senatorial Districts ₦1,350,000,000.00. Construction & rehabilitation of Area Commanders resident in Sabon Gari LGA, Kaduna State ₦350,000,000.00. Construction of six-man Rank & File Qtrs & provision of furnitures at PTS Gwaram, Jigawa State ₦845,576,662.84",
    "type": "ONGOING",
    "amount": 1781903664,
    "page": 337
  },
  {
    "ergp": "ERGP14240533",
    "name": "Construction of Drainages & Asphalt at PTS Gwaram Jigawa State",
    "type": "ONGOING",
    "amount": 426480024,
    "page": 337
  },
  {
    "ergp": "ERGP14240547",
    "name": "Renovation of existing Police Station with 4-man Rank & File Qtrs at Airport Abuja ₦500,000,000.00. Completion of Police Station in Birniwa LGA Jigawa State ₦286,257,278.25. Construction & provision rehabilitation of Danmagaji, City & Samaru Police Station & completion of Zangon Aya Police Station, Kaduna State ₦600,000,000.00. Construction of infrastructures in Maiduguri ₦850,000,000.00. Renovation of Mbeke Customary Court Building in Ebonyi LGA of Ebonyi North Senatorial District ₦50,000,000.00",
    "type": "ONGOING",
    "amount": 2217074327,
    "page": 337
  },
  {
    "ergp": "ERGP14240557",
    "name": "Rehabilitation of Police Station in Ringim, Gumel & Roni ₦141,002,167.67. Construction of Police Stations & Barracks at Bompai & some selected areas in North West ₦500,000,000.00. Rehabilitation of Police Station in Zaria, Kaduna State ₦100,000,000.00",
    "type": "ONGOING",
    "amount": 518701518,
    "page": 337
  },
  {
    "ergp": "ERGP14240602",
    "name": "Construction of Modern Area Command in Malumfashi, Katsina South Senatorial District, Katsina State (₦500,000,000) and Construction of Modern Police Station in Dungi Taraba State (₦102,314,294)",
    "type": "ONGOING",
    "amount": 106620006,
    "page": 337
  },
  {
    "ergp": "ERGP14244933",
    "name": "Construction of 18-man Rank and File with perimeter fence at Millenium City, Kaduna, Kaduna State (₦150,000,000.00). Renovation of Alakuko Divisional Headquarters Ifako Ijaye LGA Lagos State (₦100,000,000.00). Reconstruction of Agodi Area Command Ibadan Municipal OYO State (₦250,000,000.00). Fencing of Ilora Police Station in Afijio Local Government of Oyo State (₦120,501,083.00)",
    "type": "ONGOING",
    "amount": 259350758,
    "page": 337
  },
  {
    "ergp": "ERGP14244950",
    "name": "Annual licencing, internet services repair & maintenance of Police of Police Command & Central Centre FHQ Abuja ₦650,000,000.00. Expansion of Command & Control Centre to Lagos, Kaduna Port Harcourt & Jigawa ₦2,223,450,811.95. Provision of cyber security tools & solutions/renewal of annual license ₦1,500,000,000.00",
    "type": "ONGOING",
    "amount": 3061415568,
    "page": 338
  },
  {
    "ergp": "ERGP23195363",
    "name": "Safe School Intervention",
    "type": "ONGOING",
    "amount": 0,
    "page": 338
  },
  {
    "ergp": "ERGP23197927",
    "name": "Construction of Police Secondary School Kumo LGA, Gombe State",
    "type": "ONGOING",
    "amount": 3228916944,
    "page": 338
  },
  {
    "ergp": "ERGP23197952",
    "name": "Completion and furnishing of Police Secondary School Kabo (Lot 1,2,3,&4) (₦500,000,000.00)",
    "type": "ONGOING",
    "amount": 129675379,
    "page": 338
  },
  {
    "ergp": "ERGP27117367",
    "name": "Construction and equipping of Police Station Ikowopa/Kabba, Kogi State; Construction of Abuja Type 2 Police Station 8-Rank and File, Fence, Furniture, Igangan North LGA, Oyo State",
    "type": "ONGOING",
    "amount": 129814423,
    "page": 338
  },
  {
    "ergp": "ERGP27118068",
    "name": "Ongoing supply and installation of 9 No. of 500KV/11KV Substation including reticulation of 0.425KV LT line at Jibi Barracks, Deidei FCT (F-130800) (₦54,706,938.00). Ongoing supply and installation of 200 unit of stand alone solar streetlight system at Police Academy Wudil-Kano (₦3,894,220.00). Continuation of Akwana Mobile Police Barracks of Nigeria Police Force in Taraba/Benue Border (₦39,478,565.00)",
    "type": "ONGOING",
    "amount": 77750794,
    "page": 338
  },
  {
    "ergp": "ERGP27148686",
    "name": "Mapping and Geo-Spatial Tech System Phase II (Geographical Information System) (₦106,321,057.15). Document Management System for Formations and Command nationwide (₦75,502,082.89). Mapping and Geo-Spatial Tech System Phase II (GIS) (₦75,502,082.89). Document Management System for Formations and Command nationwide (₦125,502,082.89). Mapping and Geo-Special Tech System Phase II (GIS)",
    "type": "ONGOING",
    "amount": 129239895,
    "page": 338
  },
  {
    "ergp": "ERGP27173095",
    "name": "Construction/Rehabilitation Police Mobile Force 70 Squadron Base Kabba-Okenne Road Kaba Kogi",
    "type": "ONGOING",
    "amount": 84414251,
    "page": 338
  },
  {
    "ergp": "ERGP27173112",
    "name": "Ongoing construction & furnishing lot 1 ₦762,096,489; External works & equipping lot 2 (₦1,000,000,000.00) for the FCT Command HQTRS permanent site Utako, Abuja",
    "type": "ONGOING",
    "amount": 1252498254,
    "page": 338
  },
  {
    "ergp": "ERGP27197916",
    "name": "Construction of Type II Divisional Police Headquarters modified at Ikoga Zebbe, Badagry LGA Lagos State (₦150,000,000.00). Construction of Police Station at Iware Afijio LGA Oyo State (₦150,000,000.00). Construction of DPO's Quarters and 4-man Rank and File Police Barracks at Ikoga Zebee, Badagry LGA Lagos State (₦250,410,130.50). Construction of DPO's Quarters and 4-man Rank and File Police Barracks at Iware in Afijio Local Government of Oyo State (₦250,410,130.50)",
    "type": "ONGOING",
    "amount": 564117763,
    "page": 338
  },
  {
    "ergp": "ERGP27197928",
    "name": "Construction of Abuja Type II Police Station and 8-man Rank & File Quarters at Owukpa, Ogbadibo LGA Nenue State (₦150,000,000.00). Renovation, fencing and construction of 8-man Rank & File Quarters at Divisional Headquarters B Division Kabba Kabba/Onuu LGA Kogi State (₦250,000,000.00)",
    "type": "ONGOING",
    "amount": 281769870,
    "page": 338
  },
  {
    "ergp": "ERGP30173096",
    "name": "Monitoring and Evaluation of Programmes Police Accounts and Budget",
    "type": "ONGOING",
    "amount": 841651028,
    "page": 338
  },
  {
    "ergp": "ERGP4103042",
    "name": "Procurement of Arms and Ammunition including (₦1,000,000,000.00) for purchase of protective gears (ie: Bullet proof vest and helmet) (₦443,364,563.59)",
    "type": "ONGOING",
    "amount": 1025943589,
    "page": 339
  },
  {
    "ergp": "ERGP4103043",
    "name": "Procurement of Riot Control Equipment (Teargas/Rapid Deployment Razor Wired Trailers/Electric Shock Stunt Guns)",
    "type": "ONGOING",
    "amount": 486669658,
    "page": 339
  },
  {
    "ergp": "ERGP4103047",
    "name": "Procurement of Operational Equipment for PMF Squadrons Nationwide",
    "type": "ONGOING",
    "amount": 287857037,
    "page": 339
  },
  {
    "ergp": "ERGP4103048",
    "name": "Procurement of Explosive Ordinance Disposal Equipment (Anti-Bomb)",
    "type": "ONGOING",
    "amount": 88015836,
    "page": 339
  },
  {
    "ergp": "ERGP4103055",
    "name": "Purchase of Aircraft Spare Parts, Ground Handling and Hangar Equipment/Reactivation of Bell Helicopters and Pilots' Capacity Enhancement",
    "type": "ONGOING",
    "amount": 253809826,
    "page": 339
  },
  {
    "ergp": "ERGP4103077",
    "name": "Construction/Rehabilitation of Police Marine Jetties, South East Anambra",
    "type": "ONGOING",
    "amount": 56028739,
    "page": 339
  },
  {
    "ergp": "ERGP4103082",
    "name": "Completion of Police Intelligence College, Share, Kwara State",
    "type": "ONGOING",
    "amount": 169261937,
    "page": 339
  },
  {
    "ergp": "ERGP4103086",
    "name": "Procurement and Upgrade of Police Band Instrument and Accessories for Drill Training, Etc.",
    "type": "ONGOING",
    "amount": 123313201,
    "page": 339
  },
  {
    "ergp": "ERGP4103087",
    "name": "Digitization of Nigeria Police Personnel Records Database and Nigeria Police Personnel E-Warrant Card Project Phase II (₦140,000,000.00) ICT Data Mart Document Management System for all Commands and Formation Phase II (₦57,472,192.00)",
    "type": "ONGOING",
    "amount": 140363242,
    "page": 339
  },
  {
    "ergp": "ERGP4103094",
    "name": "Upgrade/Modernization of Police Printing Press; Ikeja Lagos",
    "type": "ONGOING",
    "amount": 140648991,
    "page": 339
  },
  {
    "ergp": "ERGP4103095",
    "name": "Rehabilitation of Hostels/Classrooms at Police Staff College Jos (₦400,000,000.00). Construction and fencing of Police Training School in Gwaram LGA Jigawa State (₦307,807,949.00)",
    "type": "ONGOING",
    "amount": 503109918,
    "page": 339
  },
  {
    "ergp": "ERGP4103100",
    "name": "Insurance of Nigeria Police Buildings: FHQ Abuja, FHQ Annex Lagos and FCID Area 10 Abuja",
    "type": "ONGOING",
    "amount": 68273134,
    "page": 339
  },
  {
    "ergp": "ERGP4103127",
    "name": "Procurement of Intelligence Equipment (TIU/ICT/INTERPOL) operatives nationwide; including ₦433,699,000.00 for the establishment of ICT Simulation Indoor Shooting Range Center for NPF in 37 State Command (Phase 1 Abuja & Lagos). Weapons Tracking System and Arms Inventory Management System (20,000 Arms Phase 1 FHQ Abuja) (₦150,000,000.00). Provision of Safety Desert Boot for Tactical Units (₦229,631,707.13)",
    "type": "ONGOING",
    "amount": 578115499,
    "page": 339
  },
  {
    "ergp": "ERGP4103171",
    "name": "Reconstruction and Rehabilitation of HW Modern Intelligence (Smart E-Policing Infrastructure) Force Headquarters Abuja and State CID Formations Nationwide",
    "type": "ONGOING",
    "amount": 361358219,
    "page": 339
  },
  {
    "ergp": "ERGP4103172",
    "name": "Land Location, Identification, Documentation and Compensation and other Fixed Assets",
    "type": "ONGOING",
    "amount": 62785734,
    "page": 339
  },
  {
    "ergp": "ERGP4103216",
    "name": "Procurement of Personnel Deployment Equipment and Accessories for Peacekeeping Operations. Procurement of Presidential Teleprompter Cameras and Accessories for the Nigeria Police Force (₦35,000,000.00)",
    "type": "ONGOING",
    "amount": 81220416,
    "page": 339
  },
  {
    "ergp": "ERGP4171753",
    "name": "Provision & installation of solar hybrid systems for Divisional Police Stations in selected states ₦180,000,000.00. ES Vision Artificial Intelligence Management System ₦200,000,000.00. ICT Annual Data Protection Audit & ICT Software Upgrade & License ₦80,000,000.00. NPF Enhanced Notification System (ENS) for National Security ₦90,000,000.00",
    "type": "ONGOING",
    "amount": 390940022,
    "page": 339
  },
  {
    "ergp": "ERGP4173016",
    "name": "Purchase of Patrol/Operational Vehicles",
    "type": "ONGOING",
    "amount": 2840596480,
    "page": 339
  },
  {
    "ergp": "ERGP4173031",
    "name": "Acquisition of Force Animal/Handling Equipment and Other Logistics",
    "type": "ONGOING",
    "amount": 78510363,
    "page": 340
  },
  {
    "ergp": "ERGP4197955",
    "name": "Construction and fencing of modern Police Clinic, equipment of Staff Quarters in Kaugama LGA Jigawa State (₦780,000,000.00). Construction of modern Police Station, fencing and furniture of 1 No. 4-bed room SPO Quarters in Dakaitawa/Yalleman Divisional Police Headquarters in Kaugama LGA Jigawa State ₦900,000,000.00. Supply and installation of solar street light in Mallam Madori Kaugama LGA Jigawa State (₦500,000,000.00). Provision of materials for solar powered bore hole in Mallam Madori/Kagauma LGA Jigawa State (₦350,000,000.00). Construction of drainage systems at Police Divisional Headquarters and Primary School Mallam Madori Kaugama LGA Jigawa State (₦600,000,000.00). Construction of Drainage/Sewage System at SPO's Quarters in Dakaitawa/Yalleman Divisional Police Headquarters in Kaugama LGA, Jigawa LGA Area Jigawa State (₦500,000,000.00)",
    "type": "ONGOING",
    "amount": 2700261375,
    "page": 340
  },
  {
    "ergp": "ERGP4197960",
    "name": "Activation and Upgrade of the Strategic Surveillance System of Public Safety for the Nigeria Police Force Technical Intelligence Unit (COWEB Solutions)",
    "type": "ONGOING",
    "amount": 2074806068,
    "page": 340
  },
  {
    "ergp": "ERGP4216192",
    "name": "Construction and Provision of Materials for Solar Powered Boreholes in Agege, Fufore/Song and MMR/KGM Federal Constituencies",
    "type": "ONGOING",
    "amount": 183757049,
    "page": 340
  },
  {
    "ergp": "ERGP4216200",
    "name": "Procurement of Personal Protective Gears",
    "type": "ONGOING",
    "amount": 355400020,
    "page": 340
  },
  {
    "ergp": "ERGP4216205",
    "name": "Procurement of Operational Equipment and Gear for Counter Terrorism Unit (CTU)",
    "type": "ONGOING",
    "amount": 355400020,
    "page": 340
  },
  {
    "ergp": "ERGP4239430",
    "name": "Rading of Office Accommodation of Assistant Inspector General of Police Zonal UPG Offices Nationwide",
    "type": "ONGOING",
    "amount": 7000000,
    "page": 340
  },
  {
    "ergp": "ERGP4239438",
    "name": "Rehabilitation of Divisional Police Stations in Kaduna State",
    "type": "ONGOING",
    "amount": 3500000,
    "page": 340
  },
  {
    "ergp": "ERGP4239451",
    "name": "Rehabilitation of Divisional Police Stations in Benue State",
    "type": "ONGOING",
    "amount": 3500000,
    "page": 340
  },
  {
    "ergp": "ERGP4239467",
    "name": "Construction of Modern Police Stations Nationwide",
    "type": "ONGOING",
    "amount": 7000000,
    "page": 340
  },
  {
    "ergp": "ERGP4239478",
    "name": "Construction of Police Outpost Stations Nationwide",
    "type": "ONGOING",
    "amount": 7000000,
    "page": 340
  },
  {
    "ergp": "ERGP4239485",
    "name": "Provision and installation of all-in-one solar street light in Mallam Madori/Kaugama Federal Constituency, Jigawa State and some selected areas in South South, South East, South West, North Central, North East and North West Federal Constituencies",
    "type": "ONGOING",
    "amount": 329272453,
    "page": 340
  },
  {
    "ergp": "ERGP4239498",
    "name": "Construction of FCT Police Command Headquarters",
    "type": "ONGOING",
    "amount": 700000000,
    "page": 340
  },
  {
    "ergp": "ERGP4239526",
    "name": "Supply of 3 No. Hilux for Security Outfits in Katsina South Senatorial District",
    "type": "ONGOING",
    "amount": 210000000,
    "page": 340
  },
  {
    "ergp": "ERGP4240362",
    "name": "NPF Pre-Retirement Skills & Acquisition Centre Phase II Abuja",
    "type": "ONGOING",
    "amount": 73179633,
    "page": 340
  },
  {
    "ergp": "ERGP4240457",
    "name": "Construction of Police Station in Gbelebu Town, Ovia South LGA, Edo State",
    "type": "ONGOING",
    "amount": 234386810,
    "page": 340
  },
  {
    "ergp": "ERGP4240467",
    "name": "Renovation of Police Children School, Oyo Central, Oyo State ₦350,000,000.00. Construction & Renovation of Police Station in Kwara North, Kwara State ₦295,190,753.69",
    "type": "ONGOING",
    "amount": 451633528,
    "page": 340
  },
  {
    "ergp": "ERGP7103103",
    "name": "Procurement of Equipment for the Implementation of Public Sector Financial Reforms (IPPIS, TSA, GIFMIS, etc)",
    "type": "ONGOING",
    "amount": 140165363,
    "page": 341
  },
  {
    "ergp": "ERGP7103155",
    "name": "Completion of On-Going Construction of Police Institute of Finance and Administration, Otuocha, Anambra State",
    "type": "ONGOING",
    "amount": 513338958,
    "page": 341
  },
  {
    "ergp": "ERGP20269727",
    "name": "Construction of Police Divisional Offices in Gwaram Federal Constituency Jigawa State (Multiple Lots)",
    "type": "ONGOING",
    "amount": 350000000,
    "page": 341
  }
];
