import { fetch } from "expo/fetch";
import Constants from "expo-constants";
import { appWording } from "./copy";

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "https://agent-dates.vercel.app").replace(/\/$/, "");

// The website's pages: the same deployment as the API, under Kismet's own name (what the browser's address bar shows).
// Their /app/* copies: the same text without the village's own name (agent-dates src/lib/pages-copy.ts), noindex.
const SITE_URL = process.env.EXPO_PUBLIC_API_URL ? API_URL : "https://kismet-village.vercel.app";
export const LINKS = {
  privacy: `${SITE_URL}/app/privacy`,
  terms: `${SITE_URL}/app/terms`,
  support: `${SITE_URL}/app/support`,
  waitlist: `${SITE_URL}/app/waitlist`,
};

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "ApiError";
  }
}

// Tells the backend which client made the call (ios/1.0.0, android/1.0.0). Native only: on the web build a custom
// header would need a CORS preflight the API does not answer.
export const CLIENT_HEADER: Record<string, string> =
  process.env.EXPO_OS === "web" ? {} : { "x-kismet-client": `${process.env.EXPO_OS}/${Constants.expoConfig?.version ?? "0"}` };

let currentToken: string | null = null;
export const setApiToken = (token: string | null) => {
  currentToken = token;
};

const MESSAGES: Record<number, string> = {
  401: "You're signed out. Open your private link to sign back in.",
  404: "Not found.",
  429: "Slow down a little and try again later.",
};

type Options = { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown; token?: string | null };

export async function api<T>(path: string, { method = "GET", body, token }: Options = {}): Promise<T> {
  const auth = token === undefined ? currentToken : token;
  let res: Response;
  try {
    res = (await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        accept: "application/json",
        ...CLIENT_HEADER,
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
        ...(auth ? { authorization: `Bearer ${auth}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })) as unknown as Response;
  } catch {
    throw new ApiError("Can't reach Kismet. Check your connection and try again.", 0);
  }
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const d = data as { error?: string; text?: string } | null;
    const msg = d?.text || d?.error;
    throw new ApiError((msg && appWording(msg)) || MESSAGES[res.status] || `Something went wrong (${res.status}).`, res.status);
  }
  return data as T;
}

/** The recommendation or match is no longer there (they left Kismet, or it closed): block/report answer 410 with a text.
 * A 404 is not "gone" (it would mean a missing route), so it is never shown as if the block worked. */
export const isGone = (e: unknown): e is ApiError => e instanceof ApiError && e.status === 410;

/** The backend's own text for a gone recommendation or match, or `fallback` when it sent none. */
export const goneMessage = (e: ApiError, fallback: string) => (e.message && !e.message.startsWith("Something went wrong") ? e.message : fallback);

export const privateLinkFor = (token: string) => `${API_URL}/u/${token}`;

/** Accepts a full private link (https://.../u/<token>), an agentdates:// or kismet:// link or the bare token. */
export function tokenFromInput(input: string): string | null {
  const s = input.trim();
  const m = s.match(/\/u\/([A-Za-z0-9_-]{20,100})/);
  const t = m ? m[1] : s;
  return /^[A-Za-z0-9_-]{20,100}$/.test(t) ? t : null;
}
