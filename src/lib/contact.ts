import type { Contact } from "./types";

/** How to reach a match outside Kismet: a short label for the row, the button title and the link to open. */
export type ExternalContact = { label: string; button: string; url: string };

const https = (u: string | null | undefined) => (u && /^https:\/\/\S+$/.test(u) ? u : null);

/**
 * A match's Telegram or WhatsApp, or null when they chose neither (then they're reached by a message in the app).
 * Uses the backend's `contact` / `link` and never builds a bare "https://t.me/" from an empty handle; older
 * servers send only `telegram` (possibly "" or null) and `link`.
 */
export function externalContact(m: { telegram?: string | null; link?: string | null; contact?: Contact | null }): ExternalContact | null {
  const c = m.contact;
  if (c) {
    const url = https(c.link);
    if (!url || !c.value) return null;
    if (c.kind === "phone") return { label: `WhatsApp ${c.value}`, button: "WhatsApp", url };
    if (c.kind === "telegram") return { label: `@${c.value}`, button: "Telegram", url };
    return null;
  }
  const handle = m.telegram?.trim().replace(/^@/, "");
  if (handle) return { label: `@${handle}`, button: "Telegram", url: https(m.link) ?? `https://t.me/${handle}` };
  return null;
}
