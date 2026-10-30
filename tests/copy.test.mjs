// node --experimental-strip-types --test (npm test): the quiz's question order (friends first, romance opt-in) and the
// rewording of server texts that still say "dates", offline.
import assert from "node:assert/strict";
import { test } from "node:test";
import { appLink, appWording, villageWording } from "../src/lib/copy.ts";
import { lookingForText } from "../src/lib/options.ts";
import { buildSteps, hasNonRomanceGoal } from "../src/lib/quiz-steps.ts";

test("Quiz: friends first, no relationship questions without romance", () => {
  assert.deepEqual(buildSteps("undisclosed", ["friends"], "join"), ["edge", "name", "looking", "interests", "bio", "telegram", "photos", "agent", "terms", "summary"]);
  // A saved status alone never brings the questions back.
  assert.deepEqual(buildSteps("single", ["cofounder"], "edit"), ["name", "looking", "interests", "bio", "telegram", "photos", "agent", "summary"]);
});

test("Quiz: romance on asks status, openness only when single or complicated, then romance", () => {
  assert.deepEqual(buildSteps("undisclosed", ["friends", "romance"], "join").slice(0, 6), ["edge", "name", "looking", "status", "romance", "interests"]);
  assert.deepEqual(buildSteps("single", ["friends", "romance"], "join").slice(2, 7), ["looking", "status", "openness", "romance", "interests"]);
  assert.deepEqual(buildSteps("complicated", ["romance", "friends"], "edit").slice(0, 5), ["name", "looking", "status", "openness", "romance"]);
  assert.ok(!buildSteps("married", ["friends", "romance"], "join").includes("openness"));
});

test("Quiz: romance is an extra, a goal besides it is needed", () => {
  assert.equal(hasNonRomanceGoal([]), false);
  assert.equal(hasNonRomanceGoal(["romance"]), false);
  assert.equal(hasNonRomanceGoal(["romance", "vibes"]), true);
  assert.equal(lookingForText(["romance", "friends", "cofounder"]), "Friends, Co-founder, Romance");
});

test("Server texts in the app's wording", () => {
  assert.equal(appWording("Your agent already went on 3 dates today. More tomorrow!"), "Your agent already had 3 chats today. More tomorrow!");
  assert.equal(appWording("Your agents can't go on a date (already dated, or not a fit)."), "Your agents can't chat (they already met, or it's not a fit).");
  assert.equal(appWording("No new people to date right now. Check back as more residents join!"), "No new people to meet right now. Check back as more residents join!");
  assert.equal(appWording("Too many dates from this network today. Back tomorrow!"), "Too many agent chats from this network today. Back tomorrow!");
  assert.equal(appWording("Lots of new sign-ups today, so new accounts start dating tomorrow."), "Lots of new sign-ups today, so new accounts start meeting people tomorrow.");
  assert.equal(appWording("Lovely, welcome! Your agent only dates other Edge City residents."), "Lovely, welcome! Your agent only meets other village residents.");
  assert.equal(appWording("Unblocked. Your agents may meet again in future dates."), "Unblocked. Your agents may meet again in future chats.");
  assert.match(appWording("Thanks for telling me! Kismet is Edge City only for now: it's dating and friends for the people at Edge City India in Mandrem, Goa."), /it connects the people in the village\./);
  assert.match(appWording('answer "Are you at Edge City India?" first (at x/home), and your agent goes back on dates.'), /gets back to meeting people\.$/);
  assert.equal(appWording("Your agent goes on dates with residents."), "Your agent has agent chats with residents.");
  assert.equal(appWording("Date not found (or still running)."), "Not found (or still running).");
  assert.match(appWording("It's a match! You and Zara both said yes."), /^You're connected!/);
  // Words that only contain "date" are left alone.
  assert.equal(appWording("Update your profile. Validated."), "Update your profile. Validated.");
});

test("Server texts without the village's own name, place or dates", () => {
  // agent-dates src/lib/edge-city.ts, as the app gets them (POST /api/me/edge-city, /api/me, start-dates replies).
  const site = "https://agent-dates.vercel.app";
  assert.equal(
    appWording(`Thanks for telling me! Kismet is Edge City only for now: it's dating and friends for the people at Edge City India in Mandrem, Goa. Join the waitlist and we'll let you know when it opens up: ${site}/waitlist`),
    "Thanks for telling me! Kismet is just for village residents for now: it connects the people in the village. Join the waitlist and we'll let you know when it opens up: https://kismet-village.vercel.app/app/waitlist",
  );
  assert.equal(
    appWording("Are you at Edge City India (Mandrem, Goa, Oct 11 - Nov 1 2026)? Kismet is only for its residents right now, so your agent takes a break from dates until you answer."),
    "Are you living in the village right now? Kismet is only for its residents right now, so your agent takes a break until you answer.",
  );
  assert.equal(
    appWording('Kismet is now just for Edge City India residents: answer "Are you at Edge City India?" first, and your agent goes back on dates.'),
    'Kismet is now just for village residents: answer "Are you living in the village right now?" first, and your agent gets back to meeting people.',
  );
  assert.equal(
    appWording("Quick one: Kismet is now just for Edge City India residents (Mandrem, Goa). Are you at Edge City India?"),
    "Quick one: Kismet is now just for village residents. Are you living in the village right now?",
  );
  assert.match(appWording("Join the waitlist. If you are at Edge City India after all, reply YES."), /If you are in the village after all, reply YES\.$/);
  // Agent-written texts: a profile, a board line, a plan.
  assert.equal(villageWording("I'm Sam. At Edge City India I'd love to meet designers."), "I'm Sam. In the village I'd love to meet designers.");
  assert.equal(villageWording("Edge City is the best place to build. Also edge city vibes, EDGE CITY INDIA."), "The village is the best place to build. Also village vibes, the village.");
  assert.equal(villageWording("Both love the Edge City India pop-up village and an Edge City sunrise swim."), "Both love the village and a village sunrise swim.");
  assert.equal(villageWording("What's on at Edge City this week, and Edge City's calendar."), "What's on in the village this week, and the village's calendar.");
  assert.equal(villageWording('"Edge City people are the best," said one.'), '"The village people are the best," said one.');
  assert.equal(villageWording("The Edge City India pop-up village. An Edge City night. In Edge City."), "The village. A village night. In the village.");
  // No "the" after a possessive, a number or a hyphen; nouns after the name; questions and lowercase starts.
  assert.equal(
    villageWording("Your Edge City highlight, my first Edge City, fellow Edge City builders, two Edge City veterans and post-Edge City plans."),
    "Your village highlight, my first village, fellow village builders, two village veterans and post-village plans.",
  );
  assert.equal(villageWording("Both are Edge City India builders."), "Both are village builders.");
  assert.equal(villageWording("Is Edge City only for founders?"), "Is the village only for founders?");
  assert.equal(villageWording("So are you at Edge City? At edge city, we surf."), "So are you living in the village right now? In the village, we surf.");
  assert.equal(villageWording("Edge City, in North Goa, is lovely."), "The village is lovely.");
  assert.equal(villageWording("Mail hello@edgecity.live or see edgecity.live."), "Mail hello@edgecity.live or see edgecity.live.");
  assert.equal(villageWording("After Edge Esmeralda and Edge City Lanna."), "After another village and another village.");
  assert.equal(villageWording("Edge-City folks and EDGE CITY."), "The village folks and the village.");
  assert.equal(villageWording(null), "");
  assert.equal(appWording(undefined), "");
  // Idempotent: a text already in the app's wording stays as it is.
  const once = appWording("Kismet is Edge City only for now: it's dating and friends for the people at Edge City India in Mandrem, Goa.");
  assert.equal(appWording(once), once);
  // Nothing else is touched: other words and links stay.
  assert.equal(
    appWording("See https://agent-dates.vercel.app/dates and https://edgecity.live/x for dates."),
    "See https://agent-dates.vercel.app/dates and https://edgecity.live/x for agent chats.",
  );
  // The places around it are neutral too (QA6 Q6-L1: Sam's demo plans said "a swim at Mandrem Beach").
  assert.equal(villageWording("Sunset walk at Mandrem beach, Goa (6 pm). Edgecase citywide."), "Sunset walk at the beach (6 pm). Edgecase citywide.");
  assert.equal(villageWording("Sun 1 Nov, 10 am: a morning walk and a swim at Mandrem Beach."), "Sun 1 Nov, 10 am: a morning walk and a swim at the beach.");
  assert.equal(villageWording("Mandrem sunsets. Both love Ashvem and stay in Arambol, near Morjim."), "The village sunsets. Both love the village and stay in the village, near the village.");
  assert.equal(villageWording("In Morjim, at Anjuna or Vagator."), "In the village, at the village.");
  assert.equal(villageWording("Anjuna Beach or Vagator beach? An Assagao cafe in North Goa."), "The beach? A village cafe in the village.");
  assert.equal(villageWording("Goa's best. Ashvem and Morjim beaches. Our Mandrem beach walk."), "The village's best. The beaches. Our beach walk.");
  // Lists while still place names; articles, numbers and plurals; hyphens; ", Goa" only where it ends the place.
  assert.equal(villageWording("Somewhere between Mandrem and Morjim. Mandrem and Ashvem are both lovely. Mandrem or Ashvem?"),
    "Somewhere between two villages. The villages are both lovely. The village?");
  assert.equal(villageWording("A Mandrem Beach sunset. An Anjuna beach party. Two Mandrem beach days, my Mandrem beaches. Goa beaches are lovely."),
    "A beach sunset. A beach party. Two beach days, my beaches. The beaches are lovely.");
  assert.equal(villageWording("two Goa trips and her favourite Mandrem spot, a quiet Ashvem guesthouse. Then Mandrem."),
    "two village trips and her favourite village spot, a quiet village guesthouse. Then the village.");
  assert.equal(villageWording("A Goa-based designer, post-Goa plans. Lunch in Assagão."), "A village-based designer, post-village plans. Lunch in the village.");
  assert.equal(villageWording("I love Mandrem, Goa is too busy though. Coffee in Mandrem, Goa then Morjim."),
    "I love the village, the village is too busy though. Coffee in the village then the village.");
  // The second review: lists after an article or a possessive, "the" inside a list, two clauses, possessives.
  assert.equal(villageWording("a Mandrem or Ashvem guesthouse; an Anjuna or Vagator day; my Mandrem and Ashvem friends; the Mandrem and Ashvem crowd."),
    "a village guesthouse; a village day; my village friends; the village crowd.");
  assert.equal(villageWording("two Mandrem and Ashvem beaches; a Mandrem Beach or Ashvem Beach walk; a Vagator beach, the Ashvem beach; Anjuna Beach or the Vagator beach?"),
    "two beaches; a beach walk; a beach, the beach; the beach?");
  // The third review: "How's", "that", "both", "first" are not determiners; a list's singular beach before a noun.
  assert.equal(villageWording("How's Mandrem treating you? She said that Ashvem has the best sunsets. Both Mandrem and Ashvem are quiet. First Mandrem, then Ashvem."),
    "How's the village treating you? She said that the village has the best sunsets. Both the villages are quiet. First the village, then the village.");
  assert.equal(villageWording("I love Mandrem and Ashvem beach walks. Mandrem and Morjim beach shacks are great."),
    "I love the beach walks. The beach shacks are great.");
  assert.equal(villageWording("After Mandrem, Ashvem feels busy. Mandrem, Ashvem and Morjim."), "After the village, the village feels busy. The villages.");
  assert.equal(villageWording("Wednesday's Anjuna flea market. Sam's Mandrem plan. It's Mandrem. Look at Goa's best beach."),
    "Wednesday's village flea market. Sam's village plan. It's the village. Look at the village's best beach.");
  assert.equal(villageWording("Mandrem, in North Goa, is quiet. Mandrem Goa is lovely."), "The village is quiet. The village is lovely.");
  // Text without a place is never touched by these rules (the first review: a generic "say it once" rule ate words).
  for (const t of ["Once you're in the village, the village feels small.", "Meet at the beach, the beach shack has great chai."]) assert.equal(villageWording(t), t);
  assert.equal(villageWording("Since you're both at Edge City, the village fair on Sunday is a natural first meet."),
    "Since you're both in the village, the village fair on Sunday is a natural first meet.");
  // Not inside a longer word or name, a handle, an email, a domain or a link.
  assert.equal(
    villageWording("Goan food with Priya Goasha and Ana Mandrem-Silva; @arambol_surf, mandrem_dev, hi@goa.in, mandrem.com, t.me/anjuna, https://maps.example/?q=Mandrem+Beach"),
    "Goan food with Priya Goasha and Ana Mandrem-Silva; @arambol_surf, mandrem_dev, hi@goa.in, mandrem.com, t.me/anjuna, https://maps.example/?q=Mandrem+Beach",
  );
  for (const s of ["Edge City", "Edge City India", "edgecity"]) assert.doesNotMatch(appWording(`Hi from ${s}. ${s} rocks at ${s}.`), /edge ?city/i);
});

test("Links to the website's pages go to their /app copies (no village name), other links stay", () => {
  // agent-dates src/app/app: /app/waitlist, /app/join, /app/support, /app/privacy, /app/terms. Same rule as appLink() in
  // plugins/with-messages-extension/swift/Views.swift.
  for (const page of ["waitlist", "join", "support", "privacy", "terms"]) {
    for (const host of ["https://kismet-village.vercel.app", "https://agent-dates.vercel.app"]) {
      assert.equal(appLink(`${host}/${page}`), `https://kismet-village.vercel.app/app/${page}`);
    }
  }
  assert.equal(appLink("https://kismet-village.vercel.app/waitlist?ref=abcd1234"), "https://kismet-village.vercel.app/app/waitlist?ref=abcd1234");
  assert.equal(appLink("https://kismet-village.vercel.app/waitlist."), "https://kismet-village.vercel.app/app/waitlist.");
  for (const url of ["https://kismet-village.vercel.app/home", "https://kismet-village.vercel.app/u/abc", "https://kismet-village.vercel.app/waitlist/remove?t=x",
    "https://kismet-village.vercel.app/joinx", "https://kismet-village.vercel.app/app/waitlist", "https://agent-dates.vercel.app/api/waitlist",
    "https://evil.example/waitlist", "http://kismet-village.vercel.app/terms", "https://kismet-village.vercel.app.evil.example/terms"]) {
    assert.equal(appLink(url), url, url);
  }
  assert.equal(appWording("See https://kismet-village.vercel.app/support or https://kismet-village.vercel.app/home."),
    "See https://kismet-village.vercel.app/app/support or https://kismet-village.vercel.app/home.");
  assert.equal(villageWording("Join at https://agent-dates.vercel.app/join, it is quick."), "Join at https://kismet-village.vercel.app/app/join, it is quick.");
});
