import type { ConvertResult, SourceType } from "@/types/widget";

const STORAGE_KEY = "sitefinity-studio:conversion-history";
const MAX_ENTRIES = 20;

export interface MvcHistorySources {
  controller: string;
  model: string;
  iface: string;
  view: string;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  sourceType: SourceType;
  /** Raw pasted source for "viewmodel" / "cshtml" tabs. Unused for "mvc". */
  source: string;
  /** Raw pasted panes for the "mvc" tab. Unused otherwise. */
  mvc?: MvcHistorySources;
  result: ConvertResult;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function loadHistory(): HistoryEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function persist(entries: HistoryEntry[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // localStorage full or unavailable (private browsing) — history just won't persist.
  }
}

export function addHistoryEntry(
  entry: Omit<HistoryEntry, "id" | "timestamp">
): HistoryEntry[] {
  const next: HistoryEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
  };
  const updated = [next, ...loadHistory()].slice(0, MAX_ENTRIES);
  persist(updated);
  return updated;
}

export function removeHistoryEntry(id: string): HistoryEntry[] {
  const updated = loadHistory().filter((e) => e.id !== id);
  persist(updated);
  return updated;
}

export function clearHistory(): HistoryEntry[] {
  persist([]);
  return [];
}

export function formatRelativeTime(timestamp: number): string {
  const seconds = Math.round((Date.now() - timestamp) / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
