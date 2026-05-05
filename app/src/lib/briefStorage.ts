/**
 * Persists generated briefs keyed by firm-name+url so that swapping reports
 * doesn't lose work. One brief per firm; regenerating overwrites.
 */

const KEY = "llg.briefs.v1";

export interface StoredBrief {
  firmKey: string;
  text: string;
  generatedAt: string;
  usage?: { input: number; output: number; cache_read: number; cache_write: number };
}

export function firmKey(name: string, url: string): string {
  return `${name.toLowerCase().replace(/\s+/g, "-")}::${url.toLowerCase()}`;
}

function read(): Record<string, StoredBrief> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function write(map: Record<string, StoredBrief>): void {
  localStorage.setItem(KEY, JSON.stringify(map));
}

export function getBrief(key: string): StoredBrief | null {
  return read()[key] ?? null;
}

export function saveBrief(brief: StoredBrief): void {
  const all = read();
  all[brief.firmKey] = brief;
  write(all);
}

export function deleteBrief(key: string): void {
  const all = read();
  delete all[key];
  write(all);
}
