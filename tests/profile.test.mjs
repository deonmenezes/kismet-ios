// node --experimental-strip-types --test (npm test): Edit profile against PATCH /api/me's rules, and the weekly drop copy, offline.
import assert from "node:assert/strict";
import { test } from "node:test";
import { editPatch, normalizeTelegram, ownContactLine, validTelegram } from "../src/lib/profile.ts";
import { appWording } from "../src/lib/copy.ts";
import { chatsLeftText, datesStartedText, nextDropText, outsidePool, planLine, poolAsk } from "../src/lib/weekly.ts";

const base = {
  name: "Wanda", relStatus: "undisclosed", openness: null, lookingFor: ["friends"], gender: null, interestedIn: null,
  interests: ["Surfing"], bio: "", telegram: "", agentProfile: "", agentName: "", agentPersonality: "", publicQuotes: false,
  xHandle: "", useXPhoto: false,
};

test("Telegram: the backend's rule (t.me links and @ dropped, 4-32 letters, numbers or underscores)", () => {
  assert.equal(normalizeTelegram("  @wanda_99 "), "wanda_99");
  assert.equal(normalizeTelegram("https://t.me/wanda_99"), "wanda_99");
  assert.equal(normalizeTelegram("telegram.me/Wanda"), "Wanda");
  assert.ok(validTelegram("@wanda_99"));
  assert.ok(validTelegram("t.me/wanda_99"));
  for (const bad of ["", "   ", "@", "abc", "wanda-99", "a".repeat(33), "+91 98000 00000"]) assert.equal(validTelegram(bad), false, bad);
});

test("Edit profile: Edge City answer left out (unchanged on the server), Telegram normalized", () => {
  const out = editPatch({ ...base, telegram: "@wanda_99", edgeCity: false, edgeWeeks: ["week1"] });
  assert.equal(out.telegram, "wanda_99");
  assert.equal("edgeCity" in out, false);
  assert.equal("edgeWeeks" in out, false);
  assert.equal(out.name, "Wanda");
});

test("Edit profile: the server's extra fields (availability, area) go back as they were", () => {
  const out = editPatch({ ...base, telegram: "wanda_99", availability: "weekends", area: "Mandrem" });
  assert.equal(out.availability, "weekends");
  assert.equal(out.area, "Mandrem");
});

test("Me: no '@' line for an account without Telegram (WhatsApp / in-app only)", () => {
  // GET /api/me has no own contact method: a Telegram is hedged (WhatsApp-by-text accounts never show it to matches).
  assert.equal(ownContactLine("@wanda_99"), "Telegram @wanda_99 · shown only to matches, unless you chose WhatsApp on Kismet by text");
  for (const none of ["", "  ", null, undefined]) {
    const line = ownContactLine(none);
    assert.ok(!line.includes("@"), line);
    assert.match(line, /No Telegram/);
  }
});

test("Weekly drop: the next drop in India time (an extra Friday drop before Wednesday's)", () => {
  assert.equal(nextDropText({ label: "Wednesdays at 7 pm India time", nextDropAt: "2026-10-30T13:30:00.000Z" }), "Fri 30 Oct around 7 pm India time");
  assert.equal(nextDropText({ label: "Wednesdays at 7 pm India time", nextDropAt: "2026-11-04T13:00:00.000Z" }), "Wed 4 Nov around 6:30 pm India time");
  assert.equal(nextDropText({ label: "Wednesdays at 7 pm India time", nextDropAt: null }), "Wednesdays at 7 pm India time");
  assert.equal(nextDropText({ label: "Wednesdays at 7 pm India time", nextDropAt: "soon" }), "Wednesdays at 7 pm India time");
  assert.equal(nextDropText(null), null);
  assert.equal(nextDropText(undefined), null);
});

test("Weekly drop: 'chats started' copy says when, and the plan line", () => {
  // No promise: the drop may have nobody if the agent liked no one.
  assert.equal(datesStartedText(3, "Fri 30 Oct around 7 pm India time"), "Your agent is in 3 chats. If it likes someone, they can be your next Kismet, Fri 30 Oct around 7 pm India time.");
  assert.match(datesStartedText(1, null), /in 1 chat\. Anyone it recommends shows up here in about a minute/);
  const plan = { text: "", why: "You both surf", day: "Thu 29 Oct", time: "6:30 pm", at: "", place: "Mandrem beach", activity: "Sunset walk at Mandrem beach", confirmed: false };
  assert.equal(planLine(plan), "Thu 29 Oct, 6:30 pm: Sunset walk at Mandrem beach");
});

test("QA7 Q7-L1: outside the village pool, no agent chats and no drop are promised, the question's ask instead", () => {
  const member = { edgeCity: { member: true, answered: true, weeks: [], question: null }, datesLeftToday: 2, datesPerDay: 3 };
  const notAsked = { edgeCity: { member: false, answered: false, weeks: [], question: "Are you at Edge City India?" }, datesLeftToday: 3, datesPerDay: 3 };
  const saidNo = { ...notAsked, edgeCity: { ...notAsked.edgeCity, answered: true } };
  // Members, and older servers without edgeCity, keep the count and get no ask.
  for (const me of [member, { datesLeftToday: 1 }]) {
    assert.equal(outsidePool(me), false);
    assert.equal(poolAsk(me), null);
  }
  assert.equal(chatsLeftText(member), "2 of 3 agent chats left today");
  assert.equal(chatsLeftText({ datesLeftToday: 1 }), "1 of 3 agent chats left today");
  // Not answered yet, or said no: no count (home card and Me), the ask instead of the "Send my agent" button.
  for (const me of [notAsked, saidNo]) {
    assert.equal(outsidePool(me), true);
    assert.equal(chatsLeftText(me), null);
  }
  // The server's dropAsk (agent-dates lib/copy.ts dropAsk "above"), in the app's wording: no village name.
  assert.equal(appWording(poolAsk({ ...notAsked, dropAsk: "Answer the question above to be in the next drop." })), "Answer the question above to be in the next Kismet.");
  assert.equal(
    appWording(poolAsk({ ...saidNo, dropAsk: `If you are at Edge City India after all, tap "Yes, I'm here" above to be in the next drop.` })),
    `If you are in the village after all, tap "Yes, I'm here" above to be in the next Kismet.`,
  );
  // An older server without dropAsk: the same ask, with no drop promised.
  assert.equal(poolAsk(notAsked), "Answer the question above and your agent gets back to meeting people.");
  assert.match(poolAsk(saidNo), /^If you are in the village after all, tap "Yes, I'm here" above/);
  for (const me of [notAsked, saidNo]) assert.doesNotMatch(appWording(poolAsk(me)), /agent chats left|drop|Edge City/);
});
