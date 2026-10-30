// Writes the iMessage extension's place rules (Views.swift) from the app's (src/lib/copy.ts), so the two stay the same:
// the place constants (SPOT, PLACE, LIST, ORS, PRE, POST, DET, POSS -> villageSpot, ...) and every rule from the place
// section's first comment to the end of VILLAGE_RULES. ${X} becomes \#(villageX); flags must be "g" (case-sensitive).
// usage: npm run gen:swift (tests/village-parity.test.mjs checks that Views.swift is what this writes).
const fs = require("fs");
const path = require("path");

const BS = String.fromCharCode(92);
const NAMES = ["SPOT", "PLACE", "LIST", "ORS", "PRE", "POST", "DET", "POSS"];
const swiftName = (k) => "village" + k[0] + k.slice(1).toLowerCase();
const interp = (body) => body.replace(/\$\{(\w+)\}/g, (_, k) => {
  if (!NAMES.includes(k)) throw new Error(`unknown constant ${k}`);
  return `${BS}#(${swiftName(k)})`;
});
const raw = (body) => {
  if (body.includes('"#')) throw new Error(`would end the raw string early: ${body}`);
  if (new RegExp(`${BS}${BS}#(?!${BS}()`).test(body)) throw new Error(`a \\# that is not an interpolation: ${body}`);
  return `#"${body}"#`;
};

/** Views.swift (LF) with its place block rewritten from copy.ts (LF). */
function generate(js, sw) {
  const consts = NAMES.map((k) => {
    const m = new RegExp(`^const ${k} = String\\.raw\`(.*)\`;$`, "m").exec(js);
    if (!m) throw new Error(`no const ${k}`);
    return `private let ${swiftName(k)} = ${raw(interp(m[1]))}`;
  });
  const head = [
    "// The places around it (Goa: its beaches and villages): the constants and rules below are generated from copy.ts",
    "// (SPOT, PLACE, LIST, ORS, PRE, POST, DET, POSS and the place rules, in order; see the comments there) by",
    "// tools/swift-place-rules.cjs. Edit copy.ts, then regenerate.",
  ];
  const cStart = sw.indexOf("// The places around it (Goa: its beaches");
  const cEnd = sw.indexOf("private let villageRules");
  if (cStart < 0 || cEnd < cStart) throw new Error("Swift constants block not found");
  sw = sw.slice(0, cStart) + [...head, ...consts].join("\n") + "\n" + sw.slice(cEnd);

  const rStartJs = js.indexOf("  // The places around it, bare");
  const rEndJs = js.slice(rStartJs).search(/^\];$/m);
  if (rStartJs < 0 || rEndJs < 0) throw new Error("copy.ts place rules not found");
  const rules = js.slice(rStartJs, rStartJs + rEndJs).split("\n").filter(Boolean).map((l) => {
    if (l.trim().startsWith("//")) return l;
    const m = /^  \[new RegExp\(String\.raw`(.*)`, "g"\), "(.*)"\],$/.exec(l);
    if (!m) throw new Error(`unparsed rule line: ${l}`);
    if (/\$[&`']/.test(m[2])) throw new Error(`a JS-only replacement token: ${l}`);
    return `  (${raw(interp(m[1]))}, "${m[2]}"),`;
  });
  const rStart = sw.indexOf("  // The places around it, bare");
  const rEnd = sw.indexOf("]\n\n/// A link to one of the website's pages");
  if (rStart < 0 || rEnd < rStart) throw new Error("Swift rules block not found");
  return sw.slice(0, rStart) + rules.join("\n") + "\n" + sw.slice(rEnd);
}

const paths = (repo) => ({ js: path.join(repo, "src/lib/copy.ts"), sw: path.join(repo, "plugins/with-messages-extension/swift/Views.swift") });
const lf = (s) => s.replace(/\r\n/g, "\n");

if (require.main === module) {
  const p = paths(process.argv[2] || ".");
  const before = fs.readFileSync(p.sw, "utf8");
  let out = generate(lf(fs.readFileSync(p.js, "utf8")), lf(before));
  if (before.includes("\r\n")) out = out.replace(/\n/g, "\r\n"); // keep the checkout's line endings
  fs.writeFileSync(p.sw, out);
  console.log(`${p.sw}: ${out === before ? "unchanged" : "written"}`);
}

module.exports = { generate, paths, lf };
