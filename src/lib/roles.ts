import type { AppRole } from "@/contexts/AuthContext";

export const ROLE_LABEL: Record<AppRole, string> = {
  SYSADMIN: "System Administrator",
  BUDGET_DIR: "Budget Director",
  BUDGET_OFF: "Senior Budget Officer",
  BUDGET_CLK: "Budget Clerk",
  AUDITOR: "Internal Auditor",
  REPORT_VIEWER: "Report Viewer",
};

export const ALL_ROLES: AppRole[] = [
  "SYSADMIN", "BUDGET_DIR", "BUDGET_OFF", "BUDGET_CLK", "AUDITOR", "REPORT_VIEWER",
];