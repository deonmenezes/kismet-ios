// node --experimental-strip-types --test (npm test): the iMessage extension's villageWording() (Swift, Views.swift) and
// the app's (src/lib/copy.ts) give the same text. Swift isn't compiled on Windows, so its rules are read out of
// Views.swift, turned into JS regexes ((?i) -> the "i" flag, \#(name) -> that raw string) and run the way the Swift code
// runs them: reworded between links, each link through appLink. (From E:/tmp-noedge-shots/parity.mjs, the no-Edge pass.)
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createRequire } from "node:module";
import { villageWording } from "../src/lib/copy.ts";

const { generate, lf } = createRequire(import.meta.url)("../tools/swift-place-rules.cjs");

const swift = readFileSync(new URL("../plugins/with-messages-extension/swift/Views.swift", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const vars = Object.fromEntries([...swift.matchAll(/^private let (\w+) = #"(.*)"#$/gm)].map(([, k, v]) => [k, v]));
const block = swift.slice(swift.indexOf("private let villageRules"), swift.indexOf("]\n\n/// A link to one of the website's pages"));
// \#(name) inside a rule, and inside the raw strings it names (villagePlace uses villageSpot), as Swift interpolates them.
const resolve = (p) => p.replace(/\\#\((\w+)\)/g, (_, v) => { assert.ok(v in vars, v); return resolve(vars[v]); });
const toJs = (p) => {
  const ci = p.startsWith("(?i)");
  return new RegExp(resolve(ci ? p.slice(4) : p), ci ? "gi" : "g");
};
const rules = [...block.matchAll(/^\s*\(#"(.*)"#, "(.*)"\),$/gm)].map(([, p, to]) => [toJs(p), to]);
const [, linkFrom, linkTo] = /of: #"(.*)"#,\s*with: "(.*)", options: \.regularExpression\)/.exec(swift.slice(swift.indexOf("func appLink")));
const swiftAppLink = (url) => url.replace(new RegExp(linkFrom), linkTo);
const swiftWording = (t) => {
  let out = "", rest = t, m;
  const reword = (s) => rules.reduce((x, [re, to]) => x.replace(re, to), s);
  while ((m = /https?:\/\/\S+/.exec(rest))) { out += reword(rest.slice(0, m.index)) + swiftAppLink(m[0]); rest = rest.slice(m.index + m[0].length); }
  return out + reword(rest);
};

const site = "https://kismet-village.vercel.app";
const INPUTS = [
  // The village's name (the no-Edge pass).
  `Are you at Edge City India (Mandrem, Goa, Oct 11 - Nov 1 2026)? Kismet is only for residents right now. Reply YES or NO, and which weeks if you like (week 1, 2 or 3).`,
  `Quick one: Kismet is now just for Edge City India residents (Mandrem, Goa). Are you at Edge City India? Reply YES or NO.`,
  `Kismet is now just for Edge City India residents: answer "Are you at Edge City India?" first, and your agent goes back on dates.`,
  `Thanks for telling me! Kismet is Edge City only for now: it's dating and friends for the people at Edge City India in Mandrem, Goa. Join the waitlist: ${site}/waitlist If you are at Edge City India after all, reply YES.`,
  "Lovely, welcome! Your agent only dates other Edge City residents.",
  "Your Edge City highlight, my first Edge City, fellow Edge City builders, two Edge City veterans and post-Edge City plans.",
  "Is Edge City only for founders? So are you at Edge City? At edge city, we surf. EDGE CITY INDIA rocks.",
  "Edge City, in North Goa, is lovely. Mail hello@edgecity.live. After Edge Esmeralda and Edge City Lanna.",
  '"Edge City people are the best," said one. The Edge City India pop-up village. An Edge City night. In Edge City.',
  "Both are Edge City India builders who met at the Edge City pool on Edge City's last week.",
  // The places around it (QA6 Q6-L1): demo plans, verdicts and transcripts.
  "The plan, if you both say yes: Sun 1 Nov, 10 am: a morning walk and a swim at Mandrem Beach.",
  "Sunset walk at Mandrem beach, Goa (6 pm). Mandrem sunsets and Ashvem mornings. Both love Arambol.",
  "In Morjim, at Anjuna or Vagator, an Assagao cafe, the Mandrem side of the river. Coffee in Mandrem, Goa then Ashvem and Morjim beaches.",
  "Mandrem is lovely; Goa trip; Goa's best; Goan food; Priya Goasha; @arambol_surf; mandrem.com; hi@goa.in; mandrem_dev; #goa; Ana Mandrem-Silva.",
  `See https://maps.google.com/?q=Mandrem+Beach and ${site}/support for Mandrem Beach. t.me/anjuna stays.`,
  "our Mandrem beach walk, a Vagator beach, the Ashvem beach. Anjuna Beach at 5. MANDREM BEACH and North Goa and South Goa.",
  "Mandrem village life, in Mandrem village. Mandrem or Ashvem? Mandrem, Ashvem, Morjim. Ashwem Beach, Edge City India in Mandrem, Goa.",
  // The first review's cases: text without a place is left alone; articles, numbers, plurals, hyphens, clauses.
  "Since you're both at Edge City, the village fair on Sunday is a natural first meet. Once you're in the village, the village feels small.",
  "Meet at Mandrem Beach, the beach shack has great chai. If you're in Mandrem, the Ashvem side is quieter.",
  "Somewhere between Mandrem and Morjim. Mandrem and Ashvem are both lovely. Anjuna Beach or Vagator beach?",
  "A Mandrem Beach sunset. An Anjuna beach party. Two Mandrem beach days, my Mandrem beaches. Goa beaches are lovely. MANDREM BEACHES",
  "two Goa trips and her favourite Mandrem spot, a quiet Ashvem guesthouse. A Goa-based designer, post-Goa plans. Then Mandrem.",
  "I love Mandrem, Goa is too busy though. Lunch in Assagão. Coffee in Mandrem, Goa then Ashvem and Morjim beaches.",
  // The second review's cases.
  "a Mandrem or Ashvem guesthouse; an Anjuna or Vagator day; my Mandrem and Ashvem friends; the Mandrem and Ashvem crowd; the Mandrem or Ashvem side.",
  "two Mandrem and Ashvem beaches; a Mandrem Beach or Ashvem Beach walk; a Vagator beach, the Ashvem beach; Anjuna Beach or the Vagator beach?",
  "After Mandrem, Ashvem feels busy. Skip Anjuna, Vagator has the better sunset. In Mandrem, Ashvem is the quiet one.",
  "Wednesday's Anjuna flea market. Sam's Mandrem plan. It's Mandrem. That's Goa for you. Sam’s Ashvem swim.",
  "Mandrem, in North Goa, is quiet. Mandrem Goa is lovely. Look at Goa's best beach. Sunset at Anjuna's best spot.",
];

test("Views.swift's place block is what tools/swift-place-rules.cjs writes from copy.ts (npm run gen:swift)", () => {
  const js = lf(readFileSync(new URL("../src/lib/copy.ts", import.meta.url), "utf8"));
  assert.equal(generate(js, swift), swift);
});

test("Swift and JS villageWording() agree, rule for rule", () => {
  // Every rule line in the Swift block was read (a line the reader can't parse would silently drop a rule).
  assert.equal(rules.length, block.split("\n").filter((l) => l.trimStart().startsWith('(#"')).length);
  assert.ok(rules.length >= 40, `${rules.length} Swift rules read`);
  assert.deepEqual(Object.keys(vars).sort(), ["villageCased", "villageDet", "villageList", "villageName", "villageOrs", "villagePlace", "villagePoss", "villagePost", "villagePre", "villageSpot"]);
  for (const t of INPUTS) assert.equal(swiftWording(t), villageWording(t), t);
});

test("QA6 Q6-L1: no Goa place name is left, except inside links, handles, emails, domains and longer names", () => {
  const PLACES = /\b(?:Mandrem|Ash[vw]em|Arambol|Morjim|Anjuna|Vagator|Assag[aã]o|Goa)(?![\wã])/i;
  const kept = /https?:\/\/\S+|\S*[@#]\S+|t\.me\/\S+|\S+\.(?:com|in)\b|\S*_\S*|Goasha|Mandrem-Silva/gi;
  for (const t of INPUTS) {
    const out = villageWording(t);
    assert.doesNotMatch(out.replace(kept, ""), PLACES, out);
  }
  // No place, no change (the place rules never touch "the village" or "the beach" already there).
  for (const t of ["Once you're in the village, the village feels small.", "Meet at the beach, the beach shack has great chai."]) assert.equal(villageWording(t), t);
});
