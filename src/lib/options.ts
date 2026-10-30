// Same option lists as the web quiz (agent-dates src/lib/options.ts).

export const REL_STATUS = [
  { id: "single", label: "Single" },
  { id: "relationship", label: "In a relationship" },
  { id: "married", label: "Married" },
  { id: "complicated", label: "It's complicated" },
  { id: "undisclosed", label: "Prefer not to say" },
] as const;

export const OPENNESS = [
  { id: "mono", label: "Monogamous" },
  { id: "poly", label: "Polyamorous" },
  { id: "open", label: "Open relationship" },
  { id: "unsure", label: "Not sure" },
  { id: "undisclosed", label: "Prefer not to say" },
] as const;

// Friends and collaborators first. Romance is not a chip in the quiz: it is its own opt-in switch, off by default.
export const LOOKING_FOR = [
  { id: "friends", label: "Friends" },
  { id: "collaborators", label: "Collaborators" },
  { id: "cofounder", label: "Co-founder" },
  { id: "adventure", label: "Adventure buddy" },
  { id: "vibes", label: "Just vibes" },
  { id: "romance", label: "Romance" },
] as const;

export const GENDER = [
  { id: "man", label: "A man" },
  { id: "woman", label: "A woman" },
  { id: "nonbinary", label: "Non-binary" },
] as const;

export const INTERESTED_IN = [
  { id: "men", label: "Men" },
  { id: "women", label: "Women" },
  { id: "everyone", label: "Everyone" },
] as const;

export const INTEREST_CHIPS = [
  "AI", "Crypto", "Startups", "Building/hacking", "Content creation", "Music", "Art",
  "Fitness", "Yoga/wellness", "Surfing/beach", "Travel", "Food", "Books", "Philosophy",
  "Science", "Spirituality", "Parties", "Nature", "Gaming", "Photography",
];

export const AGENT_PROMPT =
  "Write my Kismet profile in under 150 words: who I am, what I'm building or exploring, what I want from the village, my vibe, and who I'd love to meet. First person, honest, no contact details.";

export const REPORT_REASONS = [
  { id: "harassment", label: "Harassment" },
  { id: "spam", label: "Spam" },
  { id: "fake", label: "Fake profile" },
  { id: "inappropriate", label: "Inappropriate" },
  { id: "other", label: "Something else" },
] as const;

export type RelStatus = (typeof REL_STATUS)[number]["id"];
export type Openness = (typeof OPENNESS)[number]["id"];
export type LookingFor = (typeof LOOKING_FOR)[number]["id"];
export type Gender = (typeof GENDER)[number]["id"];
export type InterestedIn = (typeof INTERESTED_IN)[number]["id"];
export type ReportReason = (typeof REPORT_REASONS)[number]["id"];

export const label = (list: readonly { id: string; label: string }[], id: string | null | undefined) =>
  list.find((o) => o.id === id)?.label ?? "";

/** "Friends, Co-founder, Romance": goals in LOOKING_FOR order (romance last), whatever order a profile saved them in. */
export const lookingForText = (ids: readonly string[]) =>
  LOOKING_FOR.filter((o) => ids.includes(o.id)).map((o) => o.label).join(", ");

export type ProfileInput = {
  name: string;
  relStatus: RelStatus;
  openness: Openness | null;
  lookingFor: LookingFor[];
  gender: Gender | null;
  interestedIn: InterestedIn | null;
  interests: string[];
  bio: string;
  telegram: string;
  agentProfile: string;
  agentName: string;
  agentPersonality: string;
  publicQuotes: boolean;
  xHandle: string;
  useXPhoto: boolean;
  /** "Are you living in the village right now?" (the API's edgeCity). Kismet is for its residents only; the server refuses false with the waitlist. */
  edgeCity?: boolean;
  /** Optional on the API: which weeks (week1, week2, week3). The app no longer asks. */
  edgeWeeks?: string[];
};

export const EMPTY_PROFILE: ProfileInput = {
  name: "", relStatus: "undisclosed", openness: null, lookingFor: [], gender: null, interestedIn: null,
  interests: [], bio: "", telegram: "", agentProfile: "", agentName: "", agentPersonality: "", publicQuotes: false,
  xHandle: "", useXPhoto: false,
};
