import { useEffect, useState } from "react";
import { getPlayers, subscribe } from "./storage";
import type { Player } from "./types";

export function usePlayers(): Player[] {
  const [list, setList] = useState<Player[]>(() => getPlayers());
  useEffect(() => subscribe(() => setList(getPlayers())), []);
  return list;
}
