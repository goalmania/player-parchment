import { useEffect, useState } from "react";
import { isInShortlist, toggleShortlist, subscribeShortlist } from "@/lib/shortlist";
import { toast } from "sonner";

export default function ShortlistButton({ id, className = "" }: { id: string; className?: string }) {
  const [active, setActive] = useState(() => isInShortlist(id));
  useEffect(() => subscribeShortlist(() => setActive(isInShortlist(id))), [id]);
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const now = toggleShortlist(id);
        toast.success(now ? "Aggiunto alla shortlist ★" : "Rimosso dalla shortlist");
      }}
      className={`dm-btn-outline !py-1.5 !px-3 text-xs ${className}`}
      title={active ? "Rimuovi dalla shortlist" : "Aggiungi alla shortlist"}
      aria-pressed={active}
    >
      {active ? "★ Shortlist" : "☆ Shortlist"}
    </button>
  );
}
