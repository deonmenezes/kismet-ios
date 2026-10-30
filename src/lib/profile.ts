import type { ProfileInput } from "./options";

/** The backend's Telegram rule (agent-dates src/lib/validate.ts): a t.me / telegram.me link and the "@" are dropped. */
export const normalizeTelegram = (s: string) =>
  s.trim().replace(/^(https?:\/\/)?(t\.me\/|telegram\.me\/)/i, "").replace(/^@/, "");

/** 4-32 letters, numbers or underscores after normalizing. PATCH /api/me and /api/signup refuse anything else, "" included. */
export const validTelegram = (s: string) => /^[A-Za-z0-9_]{4,32}$/.test(normalizeTelegram(s));

/**
 * What Edit profile sends to PATCH /api/me. The village answer (edgeCity) and weeks are left out (left out = unchanged): Edit
 * profile doesn't ask them, and sending them back would record an answer the person never gave (Home asks instead).
 */
export function editPatch(p: ProfileInput) {
  const { edgeCity: _edgeCity, edgeWeeks: _edgeWeeks, ...rest } = p;
  return { ...rest, telegram: normalizeTelegram(rest.telegram) };
}

/**
 * The contact line under the name on Me. GET /api/me has no contact method for the person themself, only the Telegram
 * on the profile. Someone who chose WhatsApp on Kismet by text is reached there even with a Telegram (the backend shows
 * matches the Telegram only when it is the chosen contact); an account without one is reached on WhatsApp or in the app.
 */
export function ownContactLine(telegram: string | null | undefined) {
  const handle = normalizeTelegram(telegram ?? "");
  return handle
    ? `Telegram @${handle} · shown only to matches, unless you chose WhatsApp on Kismet by text`
    : "No Telegram · matches message you in Kismet, or on WhatsApp if you chose that";
}
