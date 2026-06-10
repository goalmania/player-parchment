/**
 * Pagina "I miei acquisti / Le mie vendite"
 * — Acquirente: vede i report acquistati con prezzo pagato
 * — Venditore: vede i propri report venduti e il ricavo netto (dopo commissione 10% DMScout)
 */
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Purchase {
  id: string;
  player_id: string;
  buyer_id: string;
  seller_id: string;
  price_paid: number;
  commission: number;
  net_to_seller: number;
  status: string;
  created_at: string;
  player_name?: string;
  player_nationality?: string;
  player_age?: number;
  player_flag?: string;
  other_org?: string;
}

function fmt(n: number) {
  return n === 0 ? "Gratis" : `€${n.toFixed(2)}`;
}

export default function Purchases() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<"bought" | "sold">("bought");
  const [bought, setBought] = useState<Purchase[]>([]);
  const [sold, setSold] = useState<Purchase[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoadingData(true);
      const { data: boughtRaw, error: e1 } = await supabase
        .from("marketplace_purchases" as any)
        .select("*")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });
      if (e1) toast.error(e1.message);

      const { data: soldRaw, error: e2 } = await supabase
        .from("marketplace_purchases" as any)
        .select("*")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });
      if (e2) toast.error(e2.message);

      const allPlayerIds = new Set<string>([
        ...(boughtRaw || []).map((r: any) => r.player_id),
        ...(soldRaw || []).map((r: any) => r.player_id),
      ]);
      const allUserIds = new Set<string>([
        ...(boughtRaw || []).map((r: any) => r.seller_id),
        ...(soldRaw || []).map((r: any) => r.buyer_id),
      ]);

      const [{ data: pls }, { data: profs }] = await Promise.all([
        supabase.from("players").select("id, name, nationality, age, flag").in("id", Array.from(allPlayerIds)),
        supabase.from("profiles").select("user_id, org_name").in("user_id", Array.from(allUserIds)),
      ]);

      const playerMap = new Map((pls || []).map((p: any) => [p.id, p]));
      const profMap = new Map((profs || []).map((p: any) => [p.user_id, p]));

      const enrich = (r: any, side: "bought" | "sold"): Purchase => ({
        ...r,
        player_name: playerMap.get(r.player_id)?.name,
        player_nationality: playerMap.get(r.player_id)?.nationality,
        player_age: playerMap.get(r.player_id)?.age,
        player_flag: playerMap.get(r.player_id)?.flag,
        other_org: side === "bought"
          ? profMap.get(r.seller_id)?.org_name
          : profMap.get(r.buyer_id)?.org_name,
      });

      setBought((boughtRaw || []).map((r: any) => enrich(r, "bought")));
      setSold((soldRaw || []).map((r: any) => enrich(r, "sold")));
      setLoadingData(false);
    })();
  }, [user]);

  const totalSpent = useMemo(() => bought.reduce((s, p) => s + p.price_paid, 0), [bought]);
  const totalEarned = useMemo(() => sold.reduce((s, p) => s + p.net_to_seller, 0), [sold]);
  const totalCommission = useMemo(() => sold.reduce((s, p) => s + p.commission, 0), [sold]);

  if (loading) return <PageShell><div className="container py-20 text-center text-gray-soft">Caricamento…</div></PageShell>;
  if (!user) return <Navigate to="/auth" replace />;

  const list = tab === "bought" ? bought : sold;

  return (
    <PageShell>
      <section className="container py-10">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div>
            <div className="section-label mb-3">// TRANSAZIONI</div>
            <h1 className="font-display font-black uppercase text-4xl md:text-5xl mb-2">
              {tab === "bought" ? "Report acquistati" : "Report venduti"}
            </h1>
            <p className="text-gray-soft max-w-2xl">
              {tab === "bought"
                ? "I report che hai acquistato nel Marketplace. Hai accesso completo a statistiche, valutazioni e verdetto."
                : "I tuoi report venduti ad altri scout. DMScout trattiene il 10% come commissione."}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link to="/marketplace" className="dm-btn-outline">← Marketplace</Link>
            <Link to="/unlocked" className="dm-btn-outline">🔓 Sbloccati</Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mb-6 border-hairline w-fit">
          {(["bought", "sold"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2.5 font-mono text-xs uppercase tracking-[0.12rem] ${
                tab === t ? "bg-accent-lime/20 text-accent-lime" : "text-gray-soft hover:text-foreground"
              }`}
            >
              {t === "bought" ? `Acquistati (${bought.length})` : `Venduti (${sold.length})`}
            </button>
          ))}
        </div>

        {/* Riepilogo */}
        <div className="grid sm:grid-cols-3 gap-px bg-border/10 border-hairline mb-8">
          {tab === "bought" ? (
            <>
              <div className="bg-background p-4">
                <div className="text-[10px] font-mono uppercase text-gray-soft mb-1">Report acquistati</div>
                <div className="font-display font-black text-3xl">{bought.length}</div>
              </div>
              <div className="bg-background p-4">
                <div className="text-[10px] font-mono uppercase text-gray-soft mb-1">Totale speso</div>
                <div className="font-display font-black text-3xl text-red-400">{fmt(totalSpent)}</div>
              </div>
              <div className="bg-background p-4">
                <div className="text-[10px] font-mono uppercase text-gray-soft mb-1">Report gratuiti</div>
                <div className="font-display font-black text-3xl">{bought.filter(p => p.price_paid === 0).length}</div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-background p-4">
                <div className="text-[10px] font-mono uppercase text-gray-soft mb-1">Report venduti</div>
                <div className="font-display font-black text-3xl">{sold.length}</div>
              </div>
              <div className="bg-background p-4">
                <div className="text-[10px] font-mono uppercase text-gray-soft mb-1">Ricavo netto (90%)</div>
                <div className="font-display font-black text-3xl text-accent-lime">{fmt(totalEarned)}</div>
              </div>
              <div className="bg-background p-4">
                <div className="text-[10px] font-mono uppercase text-gray-soft mb-1">Commissioni DMScout (10%)</div>
                <div className="font-display font-black text-3xl text-gray-soft">{fmt(totalCommission)}</div>
              </div>
            </>
          )}
        </div>

        {loadingData ? (
          <div className="dm-card p-10 text-center text-gray-soft">Caricamento…</div>
        ) : list.length === 0 ? (
          <div className="dm-card p-10 text-center text-gray-soft">
            {tab === "bought"
              ? <>Nessun report acquistato. Vai nel <Link to="/marketplace" className="text-accent-lime underline">Marketplace</Link> per acquistarne.</>
              : "Nessun report venduto ancora."}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border/10 border-hairline">
            {list.map((p) => (
              <div key={p.id} className="bg-background p-4 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-gray-light/30 flex items-center justify-center text-xl">
                    {p.player_flag || "👤"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold uppercase truncate">{p.player_name || "—"}</div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.12rem] text-gray-soft mt-0.5">
                      {p.player_age ? `${p.player_age} anni` : ""}{p.player_nationality ? ` · ${p.player_nationality}` : ""}
                    </div>
                  </div>
                  <div className={`font-display font-black text-lg ${p.price_paid === 0 ? "text-accent-lime" : "text-foreground"}`}>
                    {fmt(p.price_paid)}
                  </div>
                </div>

                <div className="text-xs text-gray-soft border-hairline-t pt-2">
                  {tab === "bought" ? "Venduto da" : "Acquistato da"}:&nbsp;
                  <span className="text-foreground">{p.other_org || "—"}</span>
                </div>

                {tab === "sold" && p.price_paid > 0 && (
                  <div className="grid grid-cols-2 gap-1 text-[10px] font-mono uppercase">
                    <div className="border-hairline p-1.5 text-center">
                      <div className="text-gray-soft">Commissione 10%</div>
                      <div className="text-red-400">-{fmt(p.commission)}</div>
                    </div>
                    <div className="border-hairline p-1.5 text-center">
                      <div className="text-gray-soft">Ricavo netto</div>
                      <div className="text-accent-lime">{fmt(p.net_to_seller)}</div>
                    </div>
                  </div>
                )}

                <div className="text-[10px] font-mono text-gray-soft">
                  {new Date(p.created_at).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })}
                </div>

                {tab === "bought" && (
                  <Link to={`/player?id=${p.player_id}`} className="dm-btn-primary w-full text-center !py-1.5 text-xs mt-auto">
                    ✓ Apri report completo →
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}
