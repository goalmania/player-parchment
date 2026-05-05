import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
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
import SquadBuilder from "./pages/SquadBuilder";
import MatchPlanner from "./pages/MatchPlanner";
import Auth from "./pages/Auth";
import Account from "./pages/Account";
import Requests from "./pages/Requests";
import Browse from "./pages/Browse";
import Marketplace from "./pages/Marketplace";
import Unlocked from "./pages/Unlocked";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function Protected({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-soft">Caricamento…</div>;
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/shared" element={<SharedPlayer />} />
          <Route path="/player-print" element={<PlayerPrint />} />

          <Route path="/" element={<Protected><Index /></Protected>} />
          <Route path="/database" element={<Protected><Database /></Protected>} />
          <Route path="/player" element={<Protected><Player /></Protected>} />
          <Route path="/add-report" element={<Protected><AddReport /></Protected>} />
          <Route path="/edit-report" element={<Protected><EditReport /></Protected>} />
          <Route path="/ai-report" element={<Protected><AiReport /></Protected>} />
          <Route path="/compare" element={<Protected><Compare /></Protected>} />
          <Route path="/map" element={<Protected><MapPage /></Protected>} />
          <Route path="/squad-builder" element={<Protected><SquadBuilder /></Protected>} />
          <Route path="/match-planner" element={<Protected><MatchPlanner /></Protected>} />
          <Route path="/contact" element={<Protected><Contact /></Protected>} />
          <Route path="/account" element={<Protected><Account /></Protected>} />
          <Route path="/requests" element={<Protected><Requests /></Protected>} />
          <Route path="/browse" element={<Protected><Browse /></Protected>} />
          <Route path="/marketplace" element={<Protected><Marketplace /></Protected>} />
          <Route path="/unlocked" element={<Protected><Unlocked /></Protected>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
