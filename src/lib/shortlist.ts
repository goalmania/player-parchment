// Shortlist (favorites) management — kept in localStorage as a Set of player IDs.
const KEY = "dmscout_shortlist";
const subs = new Set<() => void>();

function read(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch { return new Set(); }
}
function write(s: Set<string>) {
  localStorage.setItem(KEY, JSON.stringify(Array.from(s)));
  subs.forEach((fn) => fn());
}

export function getShortlist(): Set<string> { return read(); }
export function isInShortlist(id: string): boolean { return read().has(id); }
export function toggleShortlist(id: string): boolean {
  const s = read();
  if (s.has(id)) s.delete(id); else s.add(id);
  write(s);
  return s.has(id);
}
export function subscribeShortlist(fn: () => void) {
  subs.add(fn);
  return () => { subs.delete(fn); };
}
