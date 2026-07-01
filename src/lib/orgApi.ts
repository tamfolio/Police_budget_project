import { apiFetch } from "@/lib/apiClient";

// ── Schools ─────────────────────────────────────────────────────────────────

export interface School {
  id: string;
  name: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function listSchools() {
  return apiFetch<School[]>("/schools");
}

export async function createSchool(name: string) {
  return apiFetch<School>("/schools", { method: "POST", body: { name } });
}

// ── Zones ────────────────────────────────────────────────────────────────────

export interface Formation {
  id: string;
  name: string;
  zoneId: string | null;
  items: ExpenditureItem[];
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Zone {
  id: string;
  name: string;
  area: string;
  description: string;
  formations: Formation[];
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateZonePayload {
  name: string;
  area: string;
  description: string;
}

export async function listZones() {
  return apiFetch<Zone[]>("/zones");
}

export async function createZone(payload: CreateZonePayload) {
  return apiFetch<Zone>("/zones", { method: "POST", body: payload });
}

// ── Formations ───────────────────────────────────────────────────────────────

export interface CreateFormationPayload {
  name: string;
  zoneId?: string;
}

export async function listFormations() {
  return apiFetch<Formation[]>("/formations");
}

export async function createFormation(payload: CreateFormationPayload) {
  return apiFetch<Formation>("/formations", { method: "POST", body: payload });
}

// ── Expenditure Items ────────────────────────────────────────────────────────

export interface ExpenditureItem {
  id: string;
  name: string;
  budgetCodeId: string;
  schoolId: string | null;
  formationId: string | null;
  zoneId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenditureItemPayload {
  name: string;
  budgetCodeId: string;
  schoolId?: string;
  formationId?: string;
  zoneId?: string;
}

export async function listExpenditureItems() {
  return apiFetch<ExpenditureItem[]>("/expenditure-items");
}

export async function createExpenditureItem(payload: CreateExpenditureItemPayload) {
  return apiFetch<ExpenditureItem>("/expenditure-items", { method: "POST", body: payload });
}
