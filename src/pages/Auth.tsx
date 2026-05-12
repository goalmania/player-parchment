import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import Logo from "@/components/Logo";

type Mode = "signin" | "signup";

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgType, setOrgType] = useState<"agency" | "club">("agency");
  const [orgName, setOrgName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        if (!orgName.trim()) { toast.error("Indica il nome della tua organizzazione"); setBusy(false); return; }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              org_type: orgType,
              org_name: orgName.trim(),
              display_name: displayName.trim() || email,
            },
          },
        });
        if (error) throw error;

        toast.success("Account creato! Hai 7 giorni di prova gratuita.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bentornato!");
      }
    } catch (e: any) {
      toast.error(e?.message || "Operazione fallita");
    } finally {
      setBusy(false);
    }
  };

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

      {/* Card */}
      <div style={{
        width: "100%", maxWidth: 420,
        border: "0.5px solid hsl(var(--border) / 0.12)",
        background: "hsl(var(--gray-light))",
        borderRadius: 12,
        padding: "40px 36px",
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: "0.68rem", letterSpacing: "0.18rem",
          textTransform: "uppercase", color: "hsl(var(--gray))",
          marginBottom: 8,
        }}>
          // {mode === "signup" ? "INIZIA LA PROVA GRATUITA" : "ACCESSO"}
        </div>
        <h1 style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 900, fontSize: 30,
          textTransform: "uppercase", color: "hsl(var(--white))",
          marginBottom: 6,
        }}>
          {mode === "signup" ? "7 giorni gratis" : "Accedi"}
        </h1>
        <p style={{ fontSize: 14, color: "hsl(var(--gray))", lineHeight: 1.5, marginBottom: 24 }}>
          {mode === "signup"
            ? "Crea il tuo account e inizia subito la prova gratuita. Nessuna carta richiesta."
            : "Entra nel tuo spazio scouting personale."}
        </p>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {mode === "signup" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {(["agency", "club"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setOrgType(t)}
                    style={{
                      padding: "10px 12px",
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 700, fontSize: 13,
                      textTransform: "uppercase", letterSpacing: "0.08em",
                      border: "0.5px solid",
                      borderColor: orgType === t ? "hsl(var(--accent))" : "hsl(var(--border) / 0.15)",
                      background: orgType === t ? "hsl(var(--accent) / 0.1)" : "transparent",
                      color: orgType === t ? "hsl(var(--accent))" : "hsl(var(--gray))",
                      borderRadius: 8, cursor: "pointer",
                    }}
                  >
                    {t === "agency" ? "Agenzia" : "Club"}
                  </button>
                ))}
              </div>
              <input
                className="dm-input"
                placeholder={orgType === "agency" ? "Nome agenzia *" : "Nome club *"}
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
              />
              <input
                className="dm-input"
                placeholder="Tuo nome (opzionale)"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </>
          )}
          <input
            type="email"
            className="dm-input"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus={mode === "signin"}
          />
          <input
            type="password"
            className="dm-input"
            placeholder="Password (min 8 caratteri)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
          <button
            type="submit"
            disabled={busy}
            style={{
              marginTop: 4,
              background: "hsl(var(--accent))",
              color: "hsl(var(--black))",
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 900, fontSize: 14,
              textTransform: "uppercase", letterSpacing: "0.06rem",
              padding: "13px 24px",
              border: "none", borderRadius: 8,
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.6 : 1,
              width: "100%",
            }}
          >
            {busy
              ? "Attendere…"
              : mode === "signup"
              ? "Inizia la prova gratuita →"
              : "Accedi →"}
          </button>
        </form>

        {/* Badge prova gratuita */}
        {mode === "signup" && (
          <div style={{
            marginTop: 16,
            padding: "10px 14px",
            background: "hsl(var(--accent) / 0.08)",
            border: "0.5px solid hsl(var(--accent) / 0.25)",
            borderRadius: 8,
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: "50%",
              background: "hsl(var(--accent))",
              display: "inline-block", flexShrink: 0,
            }} />
            <span style={{ fontSize: 12, color: "hsl(var(--gray))", lineHeight: 1.5 }}>
              <strong style={{ color: "hsl(var(--accent))" }}>7 giorni gratuiti</strong>, poi €49/mese o €499/anno (−15%).
              Dopo la prova potrai abbonarti su{" "}
              <a
                href="https://dmfootballservices.it/#prezzi"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "hsl(var(--accent))", textDecoration: "underline" }}
              >
                dmfootballservices.it
              </a>
            </span>
          </div>
        )}

        <div style={{ marginTop: 20, textAlign: "center", fontSize: 13, color: "hsl(var(--gray))" }}>
          {mode === "signup" ? "Hai già un account?" : "Sei nuovo?"}{" "}
          <button
            onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "hsl(var(--accent))", fontSize: 13,
              textDecoration: "underline", fontFamily: "'Barlow', sans-serif",
            }}
          >
            {mode === "signup" ? "Accedi" : "Inizia la prova gratuita"}
          </button>
        </div>
      </div>

      <p style={{
        marginTop: 24, fontSize: 11,
        color: "hsl(var(--gray))",
        fontFamily: "'Space Mono', monospace",
        textTransform: "uppercase", letterSpacing: "0.1rem",
      }}>
        © {new Date().getFullYear()} DM Scout · Scouting Operations
      </p>
    </div>
  );
}
