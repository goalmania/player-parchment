import type { Player } from "./types";

/**
 * Client-side share links.
 * The full player payload is JSON-encoded, base64 (URL-safe) and stored in the URL hash.
 * Pros: zero backend, link is self-contained, recipient can open even without an account.
 * Cons: very long URLs. Typical player ~3-8 KB encoded → URL ~5-12 KB (well within all
 * mainstream browsers' limit of 32 KB).
 */

function toUrlSafe(b64: string): string {
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromUrlSafe(s: string): string {
  let out = s.replace(/-/g, "+").replace(/_/g, "/");
  while (out.length % 4) out += "=";
  return out;
}

export function encodePlayerPayload(player: Player): string {
  const json = JSON.stringify(player);
  // unescape(encodeURIComponent(...)) keeps non-ASCII safe through btoa
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return toUrlSafe(b64);
}

export function decodePlayerPayload(payload: string): Player | null {
  try {
    const b64 = fromUrlSafe(payload);
    const json = decodeURIComponent(escape(atob(b64)));
    return JSON.parse(json) as Player;
  } catch {
    return null;
  }
}

export function buildShareLink(player: Player): string {
  const payload = encodePlayerPayload(player);
  return `${window.location.origin}/shared#p=${payload}`;
}

export function readSharedPayloadFromHash(): Player | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash || "";
  const m = hash.match(/p=([^&]+)/);
  if (!m) return null;
  return decodePlayerPayload(m[1]);
}
