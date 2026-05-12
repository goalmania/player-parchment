import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth";
import Index from "./pages/Index";
import Database from "./pages/Database";
import Player from "./pages/Player";
import PlayerPrint from "./pages/PlayerPrint";
import SharedPlayer from "./pages/SharedPlayer";
import AddReport from "./pages/AddReport";
import EditReport from "./pages/EditReport";
import AiReport from "./pages/AiReport";
import Compare from "./pages/Compare";
import MapPage from "./pages/MapPage";
import Contact from "./pages/Contact";
import FAQ from "./pages/FAQ";
import SquadBuilder from "./pages/SquadBuilder";
import MatchPlanner from "./pages/MatchPlanner";
import Auth from "./pages/Auth";
import Account from "./pages/Account";
import Requests from "./pages/Requests";
import Browse from "./pages/Browse";
import Marketplace from "./pages/Marketplace";
import Unlocked from "./pages/Unlocked";
import PianoScaduto from "./pages/PianoScaduto";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function PlanGuard({ children }: { children: JSX.Element }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-soft">
        Caricamento…
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  // Profile not yet fetched (undefined = still in flight)
  if (profile === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-soft">
        Caricamento…
      </div>
    );
  }

  const planStatus      = profile?.plan_status ?? "inactive";
  const trialEndsAt     = profile?.trial_ends_at      ? new Date(profile.trial_ends_at)      : null;
  const currentPeriodEnd = profile?.current_period_end ? new Date(profile.current_period_end) : null;
  const now = new Date();

  const emailParam = user.email ? `&email=${encodeURIComponent(user.email)}` : "";

  // Active subscription: check if current_period_end hasn't passed
  if (planStatus === "active") {
    if (currentPeriodEnd && currentPeriodEnd < now) {
      // Periodo scaduto lato client (webhook potrebbe non essere arrivato ancora)
      return <Navigate to={`/piano-scaduto?motivo=expired${emailParam}`} replace />;
    }
    return children;
  }

  // Trial still valid: allow
  if (planStatus === "trial" && trialEndsAt && trialEndsAt > now) return children;

  // Trial expired
  if (planStatus === "trial") {
    return <Navigate to={`/piano-scaduto?motivo=trial_scaduto${emailParam}`} replace />;
  }

  // Subscription expired
  if (planStatus === "expired") {
    return <Navigate to={`/piano-scaduto?motivo=expired${emailParam}`} replace />;
  }

  // No subscription (inactive) or unknown
  return <Navigate to={`/piano-scaduto?motivo=inactive${emailParam}`} replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Pubbliche — nessuna guardia piano */}
          <Route path="/auth" element={<Auth />} />
          <Route path="/piano-scaduto" element={<PianoScaduto />} />
          <Route path="/shared" element={<SharedPlayer />} />
          <Route path="/player-print" element={<PlayerPrint />} />

          {/* Protette — richiedono login + piano attivo */}
          <Route path="/" element={<PlanGuard><Index /></PlanGuard>} />
          <Route path="/database" element={<PlanGuard><Database /></PlanGuard>} />
          <Route path="/player" element={<PlanGuard><Player /></PlanGuard>} />
          <Route path="/add-report" element={<PlanGuard><AddReport /></PlanGuard>} />
          <Route path="/edit-report" element={<PlanGuard><EditReport /></PlanGuard>} />
          <Route path="/ai-report" element={<PlanGuard><AiReport /></PlanGuard>} />
          <Route path="/compare" element={<PlanGuard><Compare /></PlanGuard>} />
          <Route path="/map" element={<PlanGuard><MapPage /></PlanGuard>} />
          <Route path="/squad-builder" element={<PlanGuard><SquadBuilder /></PlanGuard>} />
          <Route path="/match-planner" element={<PlanGuard><MatchPlanner /></PlanGuard>} />
          <Route path="/contact" element={<PlanGuard><Contact /></PlanGuard>} />
          <Route path="/faq" element={<PlanGuard><FAQ /></PlanGuard>} />
          <Route path="/account" element={<PlanGuard><Account /></PlanGuard>} />
          <Route path="/requests" element={<PlanGuard><Requests /></PlanGuard>} />
          <Route path="/browse" element={<PlanGuard><Browse /></PlanGuard>} />
          <Route path="/marketplace" element={<PlanGuard><Marketplace /></PlanGuard>} />
          <Route path="/unlocked" element={<PlanGuard><Unlocked /></PlanGuard>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
