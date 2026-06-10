import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePlayers } from "@/lib/usePlayers";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Search } from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/", keywords: "home overview" },
  { label: "Database giocatori", path: "/database", keywords: "lista players archivio" },
  { label: "Mappa", path: "/map", keywords: "geografia regione" },
  { label: "Confronto", path: "/compare", keywords: "compare paragone radar" },
  { label: "Squad Builder", path: "/squad-builder", keywords: "formazione tattica modulo" },
  { label: "Match Planner", path: "/match-planner", keywords: "partita avversari" },
  { label: "Esplora", path: "/browse", keywords: "browse altri scout" },
  { label: "Account", path: "/account", keywords: "profilo settings" },
  { label: "Aggiungi Report", path: "/add-report", keywords: "nuovo report scouting" },
  { label: "Report Auto", path: "/ai-report", keywords: "intelligenza artificiale report automatico" },
  { label: "Richieste accesso", path: "/requests", keywords: "access requests" },
];

function score(query: string, target: string): number {
  if (!query) return 1;
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase();
  if (!q) return 1;
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.includes(q)) return 50;
  // fuzzy: tutti i caratteri presenti in ordine
  let ti = 0;
  for (const c of q) {
    const f = t.indexOf(c, ti);
    if (f === -1) return 0;
    ti = f + 1;
  }
  return 20;
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const players = usePlayers();
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName) && !open) {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Listen for custom event so anything can open the search
  useEffect(() => {
    const h = () => setOpen(true);
    window.addEventListener("dm:open-search", h);
    return () => window.removeEventListener("dm:open-search", h);
  }, []);

  const playerResults = useMemo(() => {
    if (!query) return players.slice(0, 8);
    return players
      .map((p) => {
        const fields = [
          p.name,
          p.club || "",
          p.position_main || "",
          p.position_code || "",
          p.nationality || "",
          p.region || "",
          (p.tags || []).join(" "),
          (p.tactical_roles || []).map((r) => r.role).join(" "),
        ].join(" ");
        return { p, s: score(query, fields) + score(query, p.name) * 1.5 };
      })
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 12)
      .map((x) => x.p);
  }, [players, query]);

  const navResults = useMemo(() => {
    if (!query) return NAV_ITEMS;
    return NAV_ITEMS
      .map((n) => ({ n, s: score(query, n.label + " " + n.keywords) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.n);
  }, [query]);

  const go = (path: string) => {
    setOpen(false);
    setQuery("");
    navigate(path);
  };

  return (
    <>
      <button
        aria-label="Cerca (⌘K)"
        onClick={() => setOpen(true)}
        className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 border-hairline text-xs font-mono text-gray-soft hover:text-foreground hover:border-accent-lime transition-colors"
      >
        <Search size={14} /> Cerca
        <kbd className="ml-1 px-1.5 py-0.5 bg-gray-light/40 text-[0.6rem] tracking-widest">⌘K</kbd>
      </button>
      <button
        aria-label="Cerca"
        onClick={() => setOpen(true)}
        className="md:hidden p-2 text-foreground"
      >
        <Search size={18} />
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Cerca giocatore, club, ruolo, sezione…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList className="max-h-[60vh]">
          <CommandEmpty>Nessun risultato.</CommandEmpty>

          {playerResults.length > 0 && (
            <CommandGroup heading={`Giocatori (${playerResults.length})`}>
              {playerResults.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`player-${p.id}-${p.name}`}
                  onSelect={() => go(`/player?id=${p.id}`)}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <span className="text-lg">{p.flag || "⚽"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-semibold uppercase text-sm truncate">
                      {p.name}
                    </div>
                    <div className="text-[0.7rem] font-mono text-muted-foreground truncate">
                      {p.club || "—"} · {p.position_main} · {p.position_code}
                    </div>
                  </div>
                  <span className="font-mono text-xs text-accent-lime">
                    {p.ratings.overall.toFixed(1)}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {navResults.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Vai a">
                {navResults.map((n) => (
                  <CommandItem
                    key={n.path}
                    value={`nav-${n.path}`}
                    onSelect={() => go(n.path)}
                    className="cursor-pointer"
                  >
                    <span className="font-display font-semibold uppercase text-sm">{n.label}</span>
                    <span className="ml-auto font-mono text-[0.65rem] text-muted-foreground">
                      {n.path}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
