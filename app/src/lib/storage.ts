import type { ProbeReport } from "../types";

const KEY = "llg.reports.v1";
const ACTIVE_KEY = "llg.activeReport.v1";

export interface StoredReport {
  id: string;
  loadedAt: string;
  report: ProbeReport;
}

function read(): StoredReport[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(reports: StoredReport[]): void {
  localStorage.setItem(KEY, JSON.stringify(reports));
}

export function listReports(): StoredReport[] {
  return read().sort((a, b) => b.loadedAt.localeCompare(a.loadedAt));
}

export function saveReport(report: ProbeReport): StoredReport {
  const id = slugify(report.firm.name) + "-" + Date.now().toString(36);
  const stored: StoredReport = { id, loadedAt: new Date().toISOString(), report };
  const all = read();
  // Cap at 20 most recent to keep localStorage sane.
  const next = [stored, ...all].slice(0, 20);
  write(next);
  setActiveReport(id);
  return stored;
}

export function getActiveReport(): StoredReport | null {
  const id = localStorage.getItem(ACTIVE_KEY);
  if (!id) return null;
  return read().find((r) => r.id === id) ?? null;
}

export function setActiveReport(id: string): void {
  localStorage.setItem(ACTIVE_KEY, id);
}

export function deleteReport(id: string): void {
  write(read().filter((r) => r.id !== id));
  if (localStorage.getItem(ACTIVE_KEY) === id) {
    localStorage.removeItem(ACTIVE_KEY);
  }
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

/**
 * Validate parsed JSON looks like a ProbeReport. We don't do exhaustive schema
 * validation — just enough to catch obvious garbage paste.
 */
export function isProbeReport(value: unknown): value is ProbeReport {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.firm === "object" &&
    v.firm != null &&
    typeof (v.firm as Record<string, unknown>).name === "string" &&
    typeof v.sources === "object" &&
    v.sources != null &&
    typeof v.coverageScore === "number"
  );
}
