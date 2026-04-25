import { useEffect, useState } from "react";
import { getPlayers, subscribe, isInitialized, loadPlayers } from "./storage";
import type { Player } from "./types";

export function usePlayers(): Player[] {
  const [list, setList] = useState<Player[]>(() => getPlayers());
  useEffect(() => {
    if (!isInitialized()) loadPlayers();
    const unsub = subscribe(() => setList([...getPlayers()]));
    return unsub;
  }, []);
  return list;
}
