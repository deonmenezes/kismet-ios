import type { DatePlan, Me } from "./types";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const IST_MS = 330 * 60_000; // India time is UTC+5:30 all year (no daylight saving)

/**
 * When the next weekly Kismet arrives: "Fri 30 Oct around 7 pm India time" from nextDropAt (an extra drop can come before
 * the usual weekday; the drop job runs within the hour before), else the server's label ("Wednesdays at 7 pm India time").
 * Null when the weekly drop is off or over (GET /api/me has no `weekly`): new recommendations then show up as they're made.
 */
export function nextDropText(weekly: Me["weekly"]): string | null {
  if (!weekly) return null;
  const t = weekly.nextDropAt ? Date.parse(weekly.nextDropAt) : NaN;
  if (Number.isNaN(t)) return weekly.label || null;
  const d = new Date(t + IST_MS);
  const h = d.getUTCHours();
  const mi = d.getUTCMinutes();
  const clock = `${h % 12 || 12}${mi ? `:${String(mi).padStart(2, "0")}` : ""} ${h < 12 ? "am" : "pm"}`;
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} around ${clock} India time`;
}

/** "Thu 22 Oct, 6:30 pm: Sunset walk at Mandrem beach" (the web app's wording for a drop's plan). */
export const planLine = (p: DatePlan) => [p.day, p.time].filter(Boolean).join(", ") + (p.activity ? `: ${p.activity}` : "");

/**
 * After "Send my agent to meet people" started some chats: held for the weekly drop while it's on (only if the agent likes someone,
 * and one person per drop), else on Home in about a minute.
 */
export function datesStartedText(started: number, drop: string | null) {
  const chats = `${started} chat${started > 1 ? "s" : ""}`;
  return drop
    ? `Your agent is in ${chats}. If it likes someone, they can be your next Kismet, ${drop}.`
    : `Your agent is in ${chats}. Anyone it recommends shows up here in about a minute.`;
}

/**
 * Outside the village pool (edgeCity.member false: the question isn't answered yet, or the answer was no): the server
 * gives them no agent chats and no drop, so the app promises neither (QA7 Q7-L1, as the website). Older servers omit
 * edgeCity: in the pool.
 */
export const outsidePool = (me: Pick<Me, "edgeCity">) => me.edgeCity?.member === false;

/**
 * What someone outside the pool is told instead of the agent chats and the drop: the server's dropAsk ("Answer the question
 * above to be in the next drop."), else the same without the drop. Shown in Home's card below the village question, after
 * appWording (which says "Kismet" for "drop").
 * Null in the pool.
 */
export function poolAsk(me: Pick<Me, "edgeCity" | "dropAsk">): string | null {
  if (!outsidePool(me)) return null;
  if (me.dropAsk) return me.dropAsk;
  return me.edgeCity?.answered
    ? `If you are in the village after all, tap "Yes, I'm here" above and your agent gets back to meeting people.`
    : "Answer the question above and your agent gets back to meeting people.";
}

/** "2 of 3 agent chats left today", or null outside the pool (no agent chats there). */
export function chatsLeftText(me: Pick<Me, "edgeCity" | "datesLeftToday" | "datesPerDay">): string | null {
  return outsidePool(me) ? null : `${me.datesLeftToday} of ${me.datesPerDay ?? 3} agent chats left today`;
}
