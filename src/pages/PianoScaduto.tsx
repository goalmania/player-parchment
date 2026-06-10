import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import Logo from "@/components/Logo";

const PREZZO_MENSILE = 49;
const PREZZO_ANNUALE_MESE = Math.round(PREZZO_MENSILE * 12 * 0.85 / 12 * 100) / 100; // 41.65
const TOTALE_ANNUO = Math.round(PREZZO_MENSILE * 12 * 0.85);                          // 499

const FEATURES = [
  "Database giocatori illimitato",
  "Report tattici completi con radar 6 assi",
  "Valutazione skills tecnico-tattica (0-100)",
  "Heatmap di posizione e profilo completo",
  "Export PDF e CSV di ogni scheda",
  "Marketplace con accesso giocatori",
  "Report assistito automaticamente",
  "Confronto giocatori side-by-side",
  "Mappa geografica giocatori",
  "Squad builder e match planner",
];

const STRIPE_MONTHLY = import.meta.env.VITE_STRIPE_LINK_DMSCOUT_MONTHLY as string | undefined;
const STRIPE_ANNUAL  = import.meta.env.VITE_STRIPE_LINK_DMSCOUT_ANNUAL  as string | undefined;
const FALLBACK_URL   = "https://dmfootballservices.it/#prezzi";

function buildStripeUrl(base: string | undefined, email: string | null): string {
  if (!base) return FALLBACK_URL;
  try {
    const url = new URL(base);
    if (email) url.searchParams.set("prefilled_email", email);
    return url.toString();
  } catch {
    return FALLBACK_URL;
  }
}

export default function PianoScaduto() {
  const [params] = useSearchParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [annuale, setAnnuale] = useState(false);

  useEffect(() => {
    if (!loading && user?.email === "dimuropaolo77@gmail.com") {
      navigate("/", { replace: true });
    }
  }, [user, loading, navigate]);

  const motivo = params.get("motivo") ?? "inactive";
  const email = params.get("email") ?? user?.email ?? null;
  const isTrialScaduto = motivo === "trial_scaduto";
  const isInactive = motivo === "inactive";

  const stripeUrl = buildStripeUrl(
    annuale ? STRIPE_ANNUAL : STRIPE_MONTHLY,
    email
  );

  const titolo = isTrialScaduto
    ? "Prova gratuita scaduta"
    : isInactive
    ? "Nessun abbonamento attivo"
    : "Abbonamento scaduto";

  const sottotitolo = isTrialScaduto
    ? "Il periodo di prova di 7 giorni è terminato. Attiva il tuo piano per continuare con tutti i tuoi dati intatti."
    : isInactive
    ? "Per accedere a DM Scout devi attivare un abbonamento o iniziare la prova gratuita."
    : "Il tuo abbonamento è scaduto. Rinnova per riprendere ad usare DM Scout.";

  return (
    <div style={{
      minHeight: "100vh",
      background: "hsl(var(--black))",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 20px",
      fontFamily: "'Barlow', sans-serif",
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 32, display: "flex", alignItems: "center", gap: 12 }}>
        <Logo size={32} variant="light" />
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 900, fontSize: 22,
          letterSpacing: "0.18rem", textTransform: "uppercase",
          color: "hsl(var(--white))",
        }}>DM SCOUT</span>
      </div>

      <div style={{
        width: "100%",
        maxWidth: 560,
        border: "0.5px solid hsl(var(--border) / 0.12)",
        background: "hsl(var(--gray-light))",
        borderRadius: 12,
        padding: "40px 36px",
        textAlign: "center",
      }}>
        {/* Icona */}
        <div style={{
          width: 56, height: 56, margin: "0 auto 20px",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: isTrialScaduto ? "hsla(71,100%,47%,0.08)" : "rgba(255,68,68,0.08)",
          border: `0.5px solid ${isTrialScaduto ? "hsla(71,100%,47%,0.3)" : "rgba(255,68,68,0.3)"}`,
          borderRadius: 12,
        }}>
          {isTrialScaduto ? (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--accent))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          ) : (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ff4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          )}
        </div>

        <h1 style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 26, fontWeight: 900,
          textTransform: "uppercase", letterSpacing: "0.04em",
          color: "hsl(var(--white))", marginBottom: 10,
        }}>
          {titolo}
        </h1>
        <p style={{ fontSize: 14, color: "hsl(var(--gray))", lineHeight: 1.6, marginBottom: 28 }}>
          {sottotitolo}
        </p>

        {/* Toggle mensile/annuale */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <div style={{
            display: "inline-flex",
            background: "hsl(var(--black))",
            border: "0.5px solid hsl(var(--border) / 0.15)",
            borderRadius: 10, padding: 3,
          }}>
            {(["Mensile", "Annuale −15%"] as const).map((label, i) => (
              <button
                key={label}
                onClick={() => setAnnuale(i === 1)}
                style={{
                  padding: "8px 20px",
                  borderRadius: 7, border: "none",
                  background: (i === 1) === annuale ? "hsl(var(--accent))" : "transparent",
                  color: (i === 1) === annuale ? "hsl(var(--black))" : "hsl(var(--gray))",
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700, fontSize: 13,
                  cursor: "pointer", letterSpacing: "0.04em",
                  transition: "all 0.15s",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Card piano unico */}
        <div style={{
          background: "hsl(var(--black))",
          border: "0.5px solid hsl(var(--accent) / 0.4)",
          borderTop: "2px solid hsl(var(--accent))",
          borderRadius: 10,
          padding: "24px 20px",
          marginBottom: 20,
          textAlign: "left",
          position: "relative",
        }}>
          <div style={{
            position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)",
            background: "hsl(var(--accent))", color: "hsl(var(--black))",
            fontSize: 9, fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700, letterSpacing: "0.1em",
            padding: "3px 12px", borderRadius: 20,
          }}>
            PIANO UNICO
          </div>

          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700, fontSize: 15,
            color: "hsl(var(--accent))", letterSpacing: "0.08em",
            textTransform: "uppercase", marginBottom: 4,
          }}>
            DM Scout Pro
          </div>

          <div style={{ marginBottom: 16 }}>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 42, fontWeight: 900,
              color: "hsl(var(--white))",
            }}>
              €{annuale ? PREZZO_ANNUALE_MESE.toFixed(2).replace(".", ",") : PREZZO_MENSILE}
            </span>
            <span style={{ fontSize: 13, color: "hsl(var(--gray))", marginLeft: 6 }}>/mese</span>
            {annuale && (
              <div style={{ fontSize: 12, color: "hsl(var(--accent))", marginTop: 4 }}>
                €{TOTALE_ANNUO} fatturato annualmente · risparmio 15%
              </div>
            )}
          </div>

          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px", columns: 2, gap: 8 }}>
            {FEATURES.map(f => (
              <li key={f} style={{
                fontSize: 12, color: "hsl(var(--gray))",
                lineHeight: 1.7, display: "flex", gap: 6, alignItems: "flex-start",
                breakInside: "avoid",
              }}>
                <span style={{ color: "hsl(var(--accent))", flexShrink: 0 }}>·</span>{f}
              </li>
            ))}
          </ul>

          <a
            href={stripeUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "block", textAlign: "center",
              padding: "13px 20px",
              background: "hsl(var(--accent))", color: "hsl(var(--black))",
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 900, fontSize: 14,
              letterSpacing: "0.06em", textTransform: "uppercase",
              textDecoration: "none", borderRadius: 8,
              transition: "opacity 0.15s",
            }}
          >
            {annuale ? `Abbonati a €${TOTALE_ANNUO}/anno →` : `Abbonati a €${PREZZO_MENSILE}/mese →`}
          </a>
        </div>

        <p style={{ fontSize: 11, color: "hsl(var(--gray))", marginBottom: 20 }}>
          IVA esclusa · Cancellazione in qualsiasi momento · I tuoi dati rimangono intatti
        </p>

        {/* Se non ha mai avuto un account → prova gratuita */}
        {isInactive && (
          <a
            href="https://dmfootballservices.it/#prova-gratuita"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "block", textAlign: "center",
              padding: "12px 20px",
              background: "transparent",
              color: "hsl(var(--accent))",
              border: "0.5px solid hsl(var(--accent) / 0.4)",
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700, fontSize: 13,
              letterSpacing: "0.06em", textTransform: "uppercase",
              textDecoration: "none", borderRadius: 8,
              marginBottom: 12,
            }}
          >
            Inizia la prova gratuita di 7 giorni →
          </a>
        )}

        {/* Supporto */}
        <a
          href="https://wa.me/393334218596"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "block", textAlign: "center",
            padding: "11px 20px",
            background: "transparent",
            color: "hsl(var(--gray))",
            border: "0.5px solid hsl(var(--border) / 0.15)",
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700, fontSize: 12,
            letterSpacing: "0.06em", textTransform: "uppercase",
            textDecoration: "none", borderRadius: 8,
            marginBottom: 20,
          }}
        >
          Contatta il supporto WhatsApp
        </a>

        <div style={{ fontSize: 12, color: "hsl(var(--gray))" }}>
          Hai già attivato un abbonamento?{" "}
          <a
            href="/auth"
            style={{ color: "hsl(var(--accent))", textDecoration: "none" }}
          >
            Ricarica la pagina
          </a>
        </div>
      </div>

      <p style={{ marginTop: 24, fontSize: 11, color: "hsl(var(--gray))", fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: "0.1rem" }}>
        © {new Date().getFullYear()} DM Scout · Scouting Operations
      </p>
    </div>
  );
}
