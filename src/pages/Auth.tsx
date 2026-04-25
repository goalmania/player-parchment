import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

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
        if (!orgName.trim()) { toast.error("Indica il nome della tua organizzazione"); return; }
        const { error } = await supabase.auth.signUp({
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
        toast.success("Account creato. Benvenuto!");
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

  const google = async () => {
    setBusy(true);
    try {
      const r = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (r.error) toast.error("Login Google fallito");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell>
      <section className="container py-12 max-w-md">
        <div className="section-label mb-3">// {mode === "signup" ? "REGISTRAZIONE" : "ACCESSO"}</div>
        <h1 className="font-display font-black uppercase text-4xl md:text-5xl mb-2">
          {mode === "signup" ? "Crea Account" : "Accedi"}
        </h1>
        <p className="text-gray-soft mb-8">
          {mode === "signup"
            ? "Registra la tua agenzia o il tuo club per gestire il database giocatori."
            : "Entra nel tuo spazio scouting personale."}
        </p>

        <button
          type="button"
          onClick={google}
          disabled={busy}
          className="dm-btn-outline w-full justify-center mb-4"
        >
          Continua con Google
        </button>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-border/30" />
          <span className="text-xs font-mono text-gray-soft uppercase tracking-[0.18rem]">oppure</span>
          <div className="flex-1 h-px bg-border/30" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <>
              <div>
                <label className="text-xs font-mono uppercase tracking-[0.12rem] text-gray-soft mb-1 block">Tipo organizzazione</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["agency", "club"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setOrgType(t)}
                      className={`px-4 py-3 font-display font-bold uppercase tracking-[0.12rem] text-sm border-hairline ${
                        orgType === t ? "bg-accent text-background" : "text-gray-soft hover:text-foreground"
                      }`}
                    >
                      {t === "agency" ? "Agenzia" : "Club"}
                    </button>
                  ))}
                </div>
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
          <button type="submit" disabled={busy} className="dm-btn-primary w-full justify-center">
            {busy ? "Attendere…" : mode === "signup" ? "Crea Account" : "Accedi"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-soft">
          {mode === "signup" ? "Hai già un account?" : "Sei nuovo?"}{" "}
          <button
            onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            className="text-accent-lime hover:underline"
          >
            {mode === "signup" ? "Accedi" : "Registrati"}
          </button>
        </div>
      </section>
    </PageShell>
  );
}
