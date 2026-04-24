import { ReactNode } from "react";
import Navbar from "./Navbar";

export default function PageShell({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      <main style={{ paddingTop: "var(--nav-height)" }}>{children}</main>
      <footer className="border-hairline-t mt-24">
        <div className="container py-8 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-gray-soft">
          <div className="flex items-center gap-2 font-mono uppercase tracking-[0.18rem]">
            <span className="pulse-dot" /> DM SCOUT — SCOUTING OPS
          </div>
          <div className="font-mono">© {new Date().getFullYear()} · Built for Serie D · Eccellenza · Promozione</div>
        </div>
      </footer>
    </>
  );
}
