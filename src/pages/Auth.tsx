import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import Logo from "@/components/Logo";

const DMFOOTBALL_TRIAL_URL = "https://dmfootballservices.it/#prova-gratuita";
const DMFOOTBALL_PRICING_URL = "https://dmfootballservices.it/#prezzi";

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Bentornato!");
    } catch (e: any) {
      toast.error(e?.message || "Credenziali non valide");
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
          fontWeight: 900,
          fontSize: 22,
          letterSpacing: "0.18rem",
          textTransform: "uppercase",
          color: "hsl(var(--white))",
        }}>DM SCOUT</span>
      </div>

      {/* Card */}
      <div style={{
        width: "100%",
        maxWidth: 420,
        border: "0.5px solid hsl(var(--border) / 0.12)",
        background: "hsl(var(--gray-light))",
        borderRadius: 12,
        padding: "40px 36px",
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: "0.68rem",
          letterSpacing: "0.18rem",
          textTransform: "uppercase",
          color: "hsl(var(--gray))",
          marginBottom: 8,
        }}>
          // ACCESSO
        </div>
        <h1 style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 900,
          fontSize: 32,
          textTransform: "uppercase",
          letterSpacing: "-0.01em",
          color: "hsl(var(--white))",
          marginBottom: 6,
        }}>
          Accedi a DM Scout
        </h1>
        <p style={{ fontSize: 14, color: "hsl(var(--gray))", lineHeight: 1.5, marginBottom: 28 }}>
          Entra nel tuo spazio scouting personale.
        </p>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            type="email"
            className="dm-input"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          <input
            type="password"
            className="dm-input"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
          <button
            type="submit"
            disabled={busy}
            className="dm-btn-primary"
            style={{ justifyContent: "center", marginTop: 4 }}
          >
            {busy ? "Accesso in corso…" : "Accedi →"}
          </button>
        </form>

        {/* Divisore */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          margin: "28px 0 24px",
        }}>
          <div style={{ flex: 1, height: 1, background: "hsl(var(--border) / 0.12)" }} />
          <span style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", color: "hsl(var(--gray))", textTransform: "uppercase", letterSpacing: "0.12rem" }}>
            Non hai un account?
          </span>
          <div style={{ flex: 1, height: 1, background: "hsl(var(--border) / 0.12)" }} />
        </div>

        {/* CTA prova gratuita */}
        <a
          href={DMFOOTBALL_TRIAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "block",
            textAlign: "center",
            padding: "13px 24px",
            background: "hsl(var(--accent))",
            color: "hsl(var(--black))",
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 900,
            fontSize: 14,
            textTransform: "uppercase",
            letterSpacing: "0.06rem",
            textDecoration: "none",
            borderRadius: 8,
            marginBottom: 10,
            transition: "opacity 0.15s",
          }}
        >
          Inizia la prova gratuita →
        </a>

        <p style={{ textAlign: "center", fontSize: 12, color: "hsl(var(--gray))", lineHeight: 1.5 }}>
          7 giorni gratis, nessuna carta richiesta.{" "}
          <a
            href={DMFOOTBALL_PRICING_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "hsl(var(--accent))", textDecoration: "underline" }}
          >
            Vedi i prezzi
          </a>
        </p>
      </div>

      {/* Footer */}
      <p style={{ marginTop: 24, fontSize: 11, color: "hsl(var(--gray))", fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: "0.1rem" }}>
        © {new Date().getFullYear()} DM Scout · Scouting Operations
      </p>
    </div>
  );
}
