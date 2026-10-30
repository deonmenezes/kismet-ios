// The server (agent-dates) still words some replies for chat agents and the website, in terms of "dates". The app talks
// about agent chats and intros, so a server text is reworded before it is shown. The API itself is unchanged.

const RULES: [RegExp, string][] = [
  // Known replies (agent-dates src/lib/engine.ts, edge-city.ts, actions.ts), whole sentences first.
  [/Your agents can't go on a date \(already dated, or not a fit\)\./g, "Your agents can't chat (they already met, or it's not a fit)."],
  [/No new people to date right now\./g, "No new people to meet right now."],
  [/Your agent already went on (\d+) dates today\./g, "Your agent already had $1 chats today."],
  [/Too many dates from this network today\./g, "Too many agent chats from this network today."],
  [/new accounts start dating tomorrow/g, "new accounts start meeting people tomorrow"],
  [/it's dating and friends for the people at/g, "it connects the people at"],
  [/Your agent only dates other/g, "Your agent only meets other"],
  [/takes a break from dates/g, "takes a break"],
  [/goes back on dates/g, "gets back to meeting people"],
  [/in future dates/g, "in future chats"],
  [/\bYour date:/g, "Your plan:"],
  [/^Date not found/g, "Not found"],
  [/It's a match!/g, "You're connected!"],
  [/\bthe next drop\b/g, "the next Kismet"],
  // Anything else.
  [/\bgoes on (?:a )?dates?\b/g, "has agent chats"],
  [/\bgo on (?:a )?dates?\b/g, "have agent chats"],
  [/\bdate plan\b/g, "meetup plan"],
  [/\bdating\b/g, "meeting people"],
  [/\bdates\b/g, "agent chats"],
  [/\bdate\b/g, "agent chat"],
];

// The backend runs for one village and names it (and its place and dates) in some texts; the app never does, it says
// "the village". Same rules as villageWording() in the iMessage extension (plugins/with-messages-extension/swift/Views.swift).
// NAME is for case-insensitive rules, CASED for rules whose replacement starts with a capital. Neither matches a domain.
const NAME = String.raw`(?:Edge[ -]?City(?: India)?)\b(?!\.\w)`;
const CASED = String.raw`(?:[Ee]dge[ -]?[Cc]ity(?: India)?|EDGE[ -]?CITY(?: INDIA)?)\b(?!\.\w)`;
// The places around it (Goa: its beaches and villages), case-sensitive: capitalised, all capitals or (but Goa) lower
// case. SPOT: the same without Goa (the region, never one of a list: "I love Mandrem, Goa is busy"). LIST: two or more
// spots with "and" or "or" before the last ("Mandrem, Ashvem and Morjim"; "After Mandrem, Ashvem feels busy" is two
// clauses); ORS: one with "or" only. PRE: what may come before a place (kept as $1: not a letter, digit, _, @, ., /, # or
// -); POST: what may not follow (a letter, digit, _, @, a dot and a letter, or a hyphen and a capital). So never part of
// a word or a name ("Goan", "Goasha", "Mandrem-Silva"), a handle, an email or a domain; links are never reworded
// (apply). DET, POSS ("Sam's", not "it's"): words after which the place reads as "village", with no "the". Every rule
// only rewrites a place name: text without one is left alone. The Swift twin is generated from these lines.
const SPOT = String.raw`(?:[Mm]andrem|MANDREM|[Aa]sh[vw]em|ASH[VW]EM|[Aa]rambol|ARAMBOL|[Mm]orjim|MORJIM|[Aa]njuna|ANJUNA|[Vv]agator|VAGATOR|[Aa]ssag[aã]o|ASSAG[AÃ]O)`;
const PLACE = String.raw`(?:${SPOT}|Goa|GOA)`;
const LIST = String.raw`${SPOT}(?:, (?:[Tt]he )?${SPOT})*,? (?:and|or) (?:[Tt]he )?${SPOT}`;
const ORS = String.raw`${SPOT}(?:, (?:[Tt]he )?${SPOT})*,? or (?:[Tt]he )?${SPOT}`;
const PRE = String.raw`(^|[^\w@./#-])`;
const POST = String.raw`(?![\w@]|\.\w|-[A-Z])`;
const DET = String.raw`[Mm]y|[Yy]our|[Oo]ur|[Tt]heir|[Hh]is|[Hh]er|[Ii]ts|[Tt]his|[Ee]very|[Ee]ach|[Ll]ast|[Nn]ext|[Ss]ame|[Ff]ellow|[Oo]ther|[Aa]ll|[Aa]ny|[Ss]ome|[Oo]wn|[Ww]hole|[Ll]ocal|[Qq]uiet|[Ff]avou?rite|[Tt]wo|[Tt]hree|[Ff]our|[Ff]ive|\d+|[Tt]he|[Aa]`;
const POSS = String.raw`(?!(?:[Ii]t|[Tt]hat|[Hh]e|[Ss]he|[Tt]here|[Hh]ere|[Ww]hat|[Ww]ho|[Ww]here|[Ll]et|[Hh]ow|[Ww]hen|[Ww]hy|[Ee]veryone|[Ee]verything|[Nn]ow)['’]s )[A-Za-z]+['’]s`;
const VILLAGE_RULES: [RegExp, string][] = [
  // The membership question and its "for now" answer (agent-dates src/lib/edge-city.ts).
  [new RegExp(String.raw`\b([Aa])re you at ${NAME}(?: \([^)]*\))?\?`, "gi"), "$1re you living in the village right now?"],
  [new RegExp(String.raw`\bis ${NAME} only(?= for now|[.,:;!]|$)`, "gi"), "is just for village residents"],
  // Its place and dates: "(Mandrem, Goa, Oct 11 - Nov 1 2026)", "in Mandrem, Goa", "Edge City, in North Goa, is".
  [new RegExp(String.raw`(${NAME}(?: residents)?) \((?=[^)]*(?:Mandrem|Goa|Oct 11))[^)]*\)`, "gi"), "$1"],
  [new RegExp(String.raw`(${NAME})(?:, in (?:Mandrem, )?(?:North )?Goa\b,?| in (?:Mandrem, )?(?:North )?Goa\b)`, "gi"), "$1"],
  // The other villages of the same series.
  [/\bEdge (?:City )?(?:Esmeralda|Lanna|Patagonia|Austin|Denver|Bhutan)\b/gi, "another village"],
  [new RegExp(String.raw`\b(?:At|In) ${CASED}`, "g"), "In the village"],
  [new RegExp(String.raw`\b(?:at|in) ${NAME}`, "gi"), "in the village"],
  [new RegExp(String.raw`\bThe ${CASED}(?: pop-up)?(?: village)?\b`, "g"), "The village"],
  [new RegExp(String.raw`\bthe ${NAME}(?: pop-up)?(?: village)?\b`, "gi"), "the village"],
  [new RegExp(String.raw`\bAn? ${CASED}`, "g"), "A village"],
  [new RegExp(String.raw`\ban? ${NAME}`, "gi"), "a village"],
  // "your Edge City highlight", "two Edge City veterans", "post-Edge City plans": no "the".
  [new RegExp(String.raw`(\b(?:my|your|our|their|his|her|its|this|that|first|last|next|fellow|every|each|other|both|all|two|three|four|five|\d+) |-)${NAME}`, "gi"), "$1village"],
  [new RegExp(String.raw`(^|[.!?]\s+|\n|["“])${NAME}`, "gi"), "$1The village"],
  [new RegExp(String.raw`\b${NAME} (residents?|members?|people|builders|folks|crowd|friends|community|weeks?|vibes?|life|days?)\b`, "gi"), "village $1"],
  [new RegExp(String.raw`\b${NAME}`, "gi"), "the village"],
  // The places around it, bare (agent-written plans and reasons: "a swim at Mandrem Beach", "Mandrem sunsets", "Ashvem,
  // Goa"): "the beach", "the village". After the rules above, which drop "(Mandrem, Goa, ...)" after the village's name.
  // ", Goa" / " in North Goa" after a place or a beach goes (not when a new clause starts: "Mandrem, Goa is busy").
  [new RegExp(String.raw`(${PLACE}|[Bb]each)(?:, in (?:North |South )?(?:Goa|GOA)${POST},?| in (?:North |South )?(?:Goa|GOA)${POST}| (?:North |South )?(?:Goa|GOA)${POST}|, (?:North |South )?(?:Goa|GOA)(?=\s*(?:[.,;:!?)(]|$)|\s+(?:then|and|or|but|for|with|to|on|at|in|near|from|by|after|before|where|which)\b))`, "g"), "$1"],
  [new RegExp(String.raw`\b(?:North|South|NORTH|SOUTH) (Goa|GOA)${POST}`, "g"), "$1"],
  // "an Anjuna ...": "a" before what it becomes ("a village", "a beach").
  [new RegExp(String.raw`\b([Aa])n (${PLACE}${POST})`, "g"), "$1 $2"],
  // Lists, while they are still place names: "Anjuna Beach or Vagator beach" is the beach, "Ashvem and Morjim beaches"
  // the beaches, "between Mandrem and Morjim" two villages, "Mandrem or Ashvem" the village, "Mandrem and Ashvem" the
  // villages; after a DET or POSS ("my Mandrem and Ashvem friends") a list reads as "village" too.
  [new RegExp(String.raw`(${SPOT}) (?:[Bb]each|BEACH)(,? (?:and|or) )(?=(?:[Tt]he )?${SPOT} (?:[Bb]each|BEACH))`, "g"), "$1$2"],
  [new RegExp(String.raw`(^|[.!?]\s+|\n|["“])(?:[Tt]he )?${LIST} (?:[Bb]each(es)?|BEACH(?:ES)?)${POST}`, "g"), "$1The beach$2"],
  [new RegExp(String.raw`\b(${DET}|${POSS}) ${LIST} (?:[Bb]each(es)?|BEACH(?:ES)?)${POST}`, "g"), "$1 beach$2"],
  [new RegExp(String.raw`${PRE}${LIST} (?:[Bb]each(es)?|BEACH(?:ES)?)${POST}`, "g"), "$1the beach$2"],
  [new RegExp(String.raw`\b([Bb]etween) (?:the )?${SPOT} and (?:the )?${SPOT}${POST}`, "g"), "$1 two villages"],
  [new RegExp(String.raw`(^|[.!?]\s+|\n|["“])${ORS}${POST}`, "g"), "$1The village"],
  [new RegExp(String.raw`\b(${DET}|${POSS}) ${ORS}${POST}`, "g"), "$1 village"],
  [new RegExp(String.raw`${PRE}${ORS}${POST}`, "g"), "$1the village"],
  [new RegExp(String.raw`(^|[.!?]\s+|\n|["“])${LIST}${POST}`, "g"), "$1The villages"],
  [new RegExp(String.raw`\b(${DET}|${POSS}) ${LIST}${POST}`, "g"), "$1 village"],
  [new RegExp(String.raw`${PRE}${LIST}${POST}`, "g"), "$1the villages"],
  // One place: its beach is the beach ("a Mandrem Beach sunset": a beach sunset), the place the village.
  [new RegExp(String.raw`(^|[.!?]\s+|\n|["“])(?:[Tt]he )?${PLACE} (?:[Bb]each(es)?|BEACH(?:ES)?)${POST}`, "g"), "$1The beach$2"],
  [new RegExp(String.raw`\b(${DET}|${POSS}) ${PLACE} (?:[Bb]each(es)?|BEACH(?:ES)?)${POST}`, "g"), "$1 beach$2"],
  [new RegExp(String.raw`${PRE}${PLACE} (?:[Bb]each(es)?|BEACH(?:ES)?)${POST}`, "g"), "$1the beach$2"],
  [new RegExp(String.raw`(^|[.!?]\s+|\n|["“])(?:[Tt]he )?${PLACE}(?: [Vv]illage)?${POST}`, "g"), "$1The village"],
  [new RegExp(String.raw`${PRE}(?:[Tt]he )?${PLACE} [Vv]illage${POST}`, "g"), "$1the village"],
  [new RegExp(String.raw`([a-z]-)${PLACE}${POST}`, "g"), "$1village"],
  [new RegExp(String.raw`\b(${DET}|${POSS}) ${PLACE}${POST}`, "g"), "$1 village"],
  [new RegExp(String.raw`\b([Aa]t|[Ii]n) ${PLACE}(?=['’]s\b)`, "g"), "$1 the village"],
  [new RegExp(String.raw`\b(?:At|In) ${PLACE}${POST}`, "g"), "In the village"],
  [new RegExp(String.raw`\b(?:at|in) ${PLACE}${POST}`, "g"), "in the village"],
  [new RegExp(String.raw`${PRE}${PLACE} (sunsets?|sunrises?|mornings?|evenings?|nights?|vibes?|life|days?|weeks?|cafes?|shacks?|market|crowd|folks|people|residents?|locals|sand|waves|surf|walks?|swims?|side)\b`, "g"), "$1village $2"],
  [new RegExp(String.raw`${PRE}${PLACE}${POST}`, "g"), "$1the village"],
];

// Links are not reworded (agent-dates.vercel.app is not an agent chat), but a link to one of the website's pages that has
// a copy without the village's own name (/waitlist, /join, /support, /privacy, /terms) goes to that copy, /app/...
// (agent-dates src/app/app). Same rule as appLink() in the iMessage extension (plugins/with-messages-extension/swift/Views.swift).
const APP_PAGE = /^https:\/\/(?:kismet-village|agent-dates)\.vercel\.app\/(waitlist|join|support|privacy|terms)(?=$|[?#]|[.,;:!)]+$)/;
export const appLink = (url: string) => url.replace(APP_PAGE, "https://kismet-village.vercel.app/app/$1");
const apply = (rules: [RegExp, string][], text: string) =>
  text
    .split(/(\bhttps?:\/\/\S+)/)
    .map((part, n) => (n % 2 ? appLink(part) : rules.reduce((s, [re, to]) => s.replace(re, to), part)))
    .join("");

/** An agent-written text (a recommendation, a plan, a board line, a chat) without the village's own name. */
export function villageWording(text: string | null | undefined): string {
  return text ? apply(VILLAGE_RULES, text) : "";
}

/** A server reply in the app's wording ("dates" become agent chats, the village is "the village"). */
export function appWording(text: string | null | undefined): string {
  return text ? villageWording(apply(RULES, text)) : "";
}
