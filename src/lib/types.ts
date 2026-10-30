import type { ProfileInput } from "./options";

// Response shapes of the live backend (agent-dates src/lib/views.ts, secret.ts, db.ts).

export type Recommendation = {
  dateId: string;
  createdAt: string;
  name: string;
  summary: string;
  interests: string[];
  sharedInterests: string[];
  myAgent: { score: number; reason: string; suggestedMeetup: string };
  worldVerified: boolean;
  photos?: string[];
  /** This week's Kismet (the weekly drop): the one person of the week, with a proposed date plan. */
  weeklyDrop?: boolean;
  plan?: DatePlan | null;
};

/** A weekly drop's date plan (agent-dates src/lib/drop.ts planView): day "Thu 22 Oct", time "6:30 pm". Confirmed once both said yes. */
export type DatePlan = { text: string; why: string; day: string; time: string; at: string; place: string; activity: string; confirmed: boolean };

/** How a match is reached: Telegram, WhatsApp ("phone"), or only a message in the app ("app", no link). */
export type Contact = { kind: "telegram" | "phone" | "app"; value: string; link: string | null; text: string };

export type Match = {
  dateId: string;
  name: string;
  /** "" (or null) when Telegram isn't how they chose to be reached. */
  telegram: string | null;
  link: string | null;
  contact?: Contact;
  matchedAt: string;
  kind: "romance" | "friendly";
  relationshipStatus?: string;
  openTo?: string | null;
  myAgentName: string;
  theirAgentName: string;
  transcript?: { who: "mine" | "theirs"; text: string }[];
  worldVerified: boolean;
  photos?: string[];
  unread?: number;
  lastMessage?: LastMessage | null;
  /** The confirmed plan of a match made from a weekly drop. */
  plan?: DatePlan | null;
};

export type LastMessage = { text: string; mine: boolean; createdAt: string };
export type PhotoRef = { id: string; url: string };

export type TopPick = {
  name: string;
  summary: string;
  sharedInterests: string[];
  percent: number;
  worldVerified: boolean;
  recommended: boolean;
  dateId: string | null;
  targetId: string | null;
};

export type Me = {
  profile: ProfileInput & { tags?: string[]; photos?: PhotoRef[] };
  datesToday: number;
  datesLeftToday: number;
  datesPerDay?: number;
  running: number;
  topPick: TopPick | null;
  recommendations: Recommendation[];
  matches: Match[];
  worldId: {
    available: boolean;
    verified: boolean;
    level: string | null;
    verifyLink: string | null;
    verifyLinkExpiresAt: string | null;
  };
  /** Kismet is for village residents only: member = in the pool; otherwise ask once (POST /api/me/edge-city). Older servers omit it. */
  edgeCity?: { member: boolean; answered: boolean; weeks: string[]; question: string | null };
  /** The weekly drop: set while new recommendations are held for the next drop (label "Wednesdays at 7 pm India time"). */
  weekly?: { label: string; nextDropAt: string | null } | null;
  /** Outside the pool (edgeCity.member false) instead of `weekly`: what to do to get in, "Answer the question above ...". Older servers omit it. */
  dropAsk?: string | null;
};

export type EdgeCityResult = { ok: true; member: boolean; answered: boolean; weeks: string[]; question: string | null; text: string };

export type Stats = { agents: number; dates: number; matches: number };
export type BoardQuote = { quote: string; chemistry: number | null; day: string };
export type Board = { stats: Stats; quotes: BoardQuote[] };

export type SignupResult = { ok: true; token: string; privateLink: string; message: string; verifyLink?: string };
export type DatesResult = { started: number; dateIds: string[]; text: string; message: string };
export type DecideResult = {
  ok: true;
  decision: "meet" | "pass";
  match: boolean;
  matchWith?: { name: string; telegram: string | null; link: string | null; contact?: Contact };
  /** A weekly drop's plan, confirmed by the match ("Your date: Thu 22 Oct, 6:30 pm ..."). */
  plan?: string;
  text: string;
};

export type BlockedPerson = { dateId: string | null; name: string; reported: boolean; blockedAt: string };
export type SafetyResult = { ok: boolean; text: string; error?: string };

export type Conversation = { matchId: string; name: string; photo: string | null; lastMessage: LastMessage | null; unread: number; matchedAt: string };
export type Inbox = { conversations: Conversation[]; unread: number };
export type ChatMessage = { id: string; mine: boolean; text: string; createdAt: string };
export type MessagesPage = { ok: true; ended: boolean; text?: string; messages: ChatMessage[] };
