import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getAlerts, markAllRead, dismissAlert, subscribeAlerts, unreadCount, type Alert,
} from "@/lib/alerts";
import { subscribe as subscribePlayers } from "@/lib/storage";

export default function AlertsBell() {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>(() => getAlerts());
  const [unread, setUnread] = useState<number>(() => unreadCount());

  useEffect(() => {
    const refresh = () => {
      setAlerts(getAlerts());
      setUnread(unreadCount());
    };
    const u1 = subscribeAlerts(refresh);
    const u2 = subscribePlayers(refresh);
    return () => {
      u1?.();
      u2?.();
    };
  }, []);

  const onToggle = () => {
    setOpen((o) => {
      const next = !o;
      if (next && unread > 0) {
        markAllRead();
        setUnread(0);
      }
      return next;
    });
  };

  return (
    <div className="relative">
      <button
        aria-label="Notifiche"
        onClick={onToggle}
        className="relative p-2 text-foreground/80 hover:text-foreground"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10 21a2 2 0 0 0 4 0" />
        </svg>
        {unread > 0 && (
          <span
            className="absolute top-1 right-1 inline-flex items-center justify-center text-[0.6rem] font-mono font-bold text-background"
            style={{
              minWidth: 16, height: 16, padding: "0 4px",
              borderRadius: 8, background: "hsl(var(--accent))",
            }}
          >{unread}</span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 mt-2 w-[340px] max-h-[70vh] overflow-auto z-50 border-hairline bg-background shadow-xl"
          >
            <div className="px-4 py-3 border-hairline-b flex items-center justify-between">
              <span className="font-display font-bold uppercase text-xs tracking-[0.18rem]">
                Alert Scout
              </span>
              <span className="font-mono text-[0.65rem] text-gray-soft">{alerts.length}</span>
            </div>

            {alerts.length === 0 ? (
              <div className="p-6 text-sm text-gray-soft text-center">
                Nessun alert al momento. Aggiungi nuove osservazioni per ricevere segnalazioni di crescita o regressione.
              </div>
            ) : (
              <ul>
                {alerts.map((a) => {
                  const color =
                    a.severity === "up" ? "hsl(var(--accent))" :
                    a.severity === "down" ? "hsl(var(--red))" : "hsl(var(--orange))";
                  return (
                    <li key={a.id} className="border-hairline-b">
                      <div className="px-4 py-3 flex gap-3">
                        <span
                          className="mt-1.5 inline-block flex-shrink-0"
                          style={{ width: 8, height: 8, borderRadius: "50%", background: color }}
                        />
                        <div className="flex-1 min-w-0">
                          <Link
                            to={`/player?id=${a.player_id}`}
                            onClick={() => setOpen(false)}
                            className="block hover:text-accent-lime transition-colors"
                          >
                            <div className="font-display font-semibold text-sm uppercase truncate">
                              #{a.player_num} · {a.player_name}
                            </div>
                            <div className="font-mono text-[0.7rem] uppercase tracking-[0.1rem]" style={{ color }}>
                              {a.title}
                            </div>
                            <div className="text-xs text-gray-soft mt-1">{a.detail}</div>
                          </Link>
                        </div>
                        <button
                          aria-label="Ignora"
                          onClick={() => dismissAlert(a.id)}
                          className="text-gray-soft hover:text-foreground"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6 6l12 12M18 6L6 18" />
                          </svg>
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
