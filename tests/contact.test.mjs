// node --experimental-strip-types --test tests/  (npm test): the match contact rules, offline.
import assert from "node:assert/strict";
import { test } from "node:test";
import { externalContact } from "../src/lib/contact.ts";

test("Telegram from the backend's contact", () => {
  assert.deepEqual(externalContact({ telegram: "deex_99", link: "https://t.me/deex_99", contact: { kind: "telegram", value: "deex_99", link: "https://t.me/deex_99", text: "" } }), {
    label: "@deex_99",
    button: "Telegram",
    url: "https://t.me/deex_99",
  });
});

test("WhatsApp-only match: wa.me link, no @ and no t.me", () => {
  const ext = externalContact({ telegram: "", link: "https://wa.me/919800000000", contact: { kind: "phone", value: "+91 98000 00000", link: "https://wa.me/919800000000", text: "" } });
  assert.equal(ext?.button, "WhatsApp");
  assert.equal(ext?.url, "https://wa.me/919800000000");
  assert.ok(!ext?.label.includes("@"));
});

test("no Telegram and no WhatsApp: nothing to show", () => {
  assert.equal(externalContact({ telegram: "", link: null, contact: { kind: "app", value: "", link: null, text: "a message in the Kismet app" } }), null);
  assert.equal(externalContact({ telegram: "", link: null }), null);
  assert.equal(externalContact({ telegram: null, link: null }), null);
  assert.equal(externalContact({ telegram: "  ", link: "https://t.me/" }), null);
});

test("older servers: telegram only, never a bare t.me", () => {
  assert.deepEqual(externalContact({ telegram: "@maya_demo", link: null }), { label: "@maya_demo", button: "Telegram", url: "https://t.me/maya_demo" });
});

test("a non-https link is never opened", () => {
  assert.equal(externalContact({ contact: { kind: "telegram", value: "x_user", link: "javascript:alert(1)", text: "" } }), null);
  assert.equal(externalContact({ telegram: "x_user", link: "http://t.me/x_user" })?.url, "https://t.me/x_user");
});
