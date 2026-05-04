import { NavLink, useLocation } from "react-router-dom";
import { useState } from "react";
import Logo from "./Logo";
import AlertsBell from "./AlertsBell";
import GlobalSearch from "./GlobalSearch";

const links = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/database", label: "Database" },
  { to: "/marketplace", label: "Marketplace" },
  { to: "/map", label: "Mappa" },
  { to: "/compare", label: "Confronto" },
  { to: "/squad-builder", label: "Squad" },
  { to: "/match-planner", label: "Match" },
  { to: "/requests", label: "Richieste" },
  { to: "/account", label: "Account" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  useLocation(); // re-render on route change

  return (
    <header
      className="fixed top-0 inset-x-0 z-50 backdrop-blur-md border-hairline-b"
      style={{ height: "var(--nav-height)", background: "hsl(0 0% 4% / 0.85)" }}
    >
      <div className="container h-full flex items-center justify-between gap-6">
        <NavLink to="/" className="flex items-center gap-2.5">
          <Logo size={28} variant="light" />
          <span className="font-display font-bold text-lg tracking-[0.18rem]">DM SCOUT</span>
        </NavLink>

        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end as any}
              className={({ isActive }) =>
                `px-3 py-2 font-display font-semibold text-sm tracking-[0.12rem] uppercase transition-colors ${
                  isActive ? "text-accent-lime" : "text-foreground/70 hover:text-foreground"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
          <GlobalSearch />
          <NavLink to="/add-report" className="ml-1 dm-btn-outline !py-1.5 !px-3 text-xs">
            + Aggiungi Report
          </NavLink>
          <AlertsBell />
        </nav>

        <div className="md:hidden flex items-center gap-1">
          <GlobalSearch />
          <AlertsBell />
          <button
            aria-label="Menu"
            className="text-foreground p-2"
            onClick={() => setOpen((o) => !o)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <><path d="M3 6h18" /><path d="M3 12h18" /><path d="M3 18h18" /></>}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden absolute inset-x-0 top-full bg-background border-hairline-b">
          <div className="container py-3 flex flex-col gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end as any}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `px-2 py-2 font-display font-semibold tracking-[0.12rem] uppercase ${
                    isActive ? "text-accent-lime" : "text-foreground/80"
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
            <NavLink to="/add-report" onClick={() => setOpen(false)} className="dm-btn-outline mt-2 justify-center">
              + Aggiungi Report
            </NavLink>
          </div>
        </div>
      )}
    </header>
  );
}
