import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/database" element={<Database />} />
          <Route path="/player" element={<Player />} />
          <Route path="/player-print" element={<PlayerPrint />} />
          <Route path="/shared" element={<SharedPlayer />} />
          <Route path="/add-report" element={<AddReport />} />
          <Route path="/edit-report" element={<EditReport />} />
          <Route path="/ai-report" element={<AiReport />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/squad-builder" element={<SquadBuilder />} />
          <Route path="/match-planner" element={<MatchPlanner />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
