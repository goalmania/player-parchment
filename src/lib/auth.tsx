import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { clearCache, loadPlayers, startRealtime, stopRealtime } from "./storage";

export type OrgType = "agency" | "club";

export interface Profile {
  id: string;
  user_id: string;
  org_type: OrgType;
  org_name: string;
  display_name: string | null;
  avatar_url: string | null;
  plan_status: "trial" | "active" | "expired" | "inactive" | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthCtx = createContext<AuthState>({
  session: null, user: null, profile: null, loading: true,
  refreshProfile: async () => {}, signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, user_id, org_type, org_name, display_name, avatar_url, plan_status, trial_ends_at, current_period_end")
      .eq("user_id", uid)
      .maybeSingle();
    if (!error && data) setProfile(data as Profile);
    else setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setTimeout(() => {
          fetchProfile(sess.user.id);
          loadPlayers().then(() => startRealtime());
        }, 0);
      } else {
        setProfile(null);
        clearCache();
        stopRealtime();
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id);
        loadPlayers().then(() => startRealtime());
      }
      setLoading(false);
    });

    return () => { sub.subscription.unsubscribe(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = async () => {
    await supabase.auth.signOut();
    clearCache();
    stopRealtime();
  };

  return (
    <AuthCtx.Provider value={{ session, user, profile, loading, refreshProfile, signOut }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
