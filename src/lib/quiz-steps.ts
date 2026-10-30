import type { ProfileInput } from "./options";

export type StepId = "edge" | "name" | "status" | "openness" | "looking" | "romance" | "interests" | "bio" | "telegram" | "photos" | "agent" | "terms" | "summary";
export type QuizMode = "join" | "edit";

/** The questions only someone who turned romance on is asked. */
export const ROMANCE_STEPS: readonly (StepId | undefined)[] = ["status", "openness", "romance"];

/** The quiz's questions in order. Friends and collaborators first; relationship questions only with romance on. */
export function buildSteps(relStatus: ProfileInput["relStatus"], lookingFor: ProfileInput["lookingFor"], mode: QuizMode) {
  // Kismet is for village residents only: a new sign-up is asked first (Edit profile is for members).
  const s: StepId[] = mode === "join" ? ["edge", "name", "looking"] : ["name", "looking"];
  // Relationship questions only for people who turned romance on (status defaults to "undisclosed" on the server).
  if (lookingFor.includes("romance")) {
    s.push("status");
    if (relStatus === "single" || relStatus === "complicated") s.push("openness");
    s.push("romance");
  }
  s.push("interests", "bio", "telegram", "photos", "agent");
  if (mode === "join") s.push("terms");
  s.push("summary");
  return s;
}

/** A goal besides romance is needed: romance is an extra, never the only reason to be here. */
export const hasNonRomanceGoal = (lookingFor: readonly string[]) => lookingFor.some((g) => g !== "romance");
