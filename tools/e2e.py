"""End-to-end run of the web build against PRODUCTION with two VERIFY-APP test residents.

Usage: python tools/e2e.py   (serve dist-web on :8790 first: python tools/spa_server.py dist-web 8790)
Signs both up through the quiz, sends B's agent on a date with A, answers yes on both sides, opens the
match, reports and blocks, then deletes both accounts through the app. Screenshots go to screens/.
Tokens are kept in memory only and never printed.
"""
import json
import sys
import time
import urllib.request

from playwright.sync_api import sync_playwright

sys.path.insert(0, "tools")
from e2e_lib import API, APP, phone  # noqa: E402

SHOTS = "screens"
STEP = {"n": 0}


def shot(page, name, wait=700):
    page.wait_for_timeout(wait)
    STEP["n"] += 1
    path = f"{SHOTS}/{STEP['n']:02d}-{name}.png"
    page.screenshot(path=path)
    print("shot", path)


def get(path, token=None):
    req = urllib.request.Request(API + path, headers={"authorization": f"Bearer {token}"} if token else {})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def token_of(page):
    return page.evaluate("() => localStorage.getItem('agent_dates_token')")


def tap_text(page, text, exact=True):
    page.get_by_text(text, exact=exact).first.click()


AGENT_PROFILES = {
    "Ada": "I'm Ada, building an open-source AI agent toolkit for small startups. In the village I want to find a collaborator or co-founder "
    "who loves shipping fast and surfing at sunrise. I'm curious, warm and direct; I love long walks on Mandrem beach, "
    "hacking on side projects and talking about how agents will change startups. I'd love to meet builders who surf.",
    "Bo": "I'm Bo, a startup engineer working on AI agents for indie founders. In the village I'm looking for a collaborator or "
    "co-founder to build an agent toolkit with, and friends for sunrise surf sessions. I'm friendly, curious and practical; "
    "I love hacking on side projects, beach walks in Mandrem and deep talks about AI and startups. Builders who surf, say hi.",
}


NOT_A_PERSON = "tools/fixtures/not-a-person.jpg"


def sign_up(page, who, shots, name=None, photo=None, handle=None):
    """Takes the quiz as VERIFY-APP <who> (or `name`); leaves the page on the Ready screen.
    photo: a file to upload on the photo step (None skips it)."""
    page.goto(APP + "/")
    page.get_by_test_id("get-started").wait_for(timeout=20000)
    if shots:
        shot(page, "welcome", 1200)
    page.get_by_test_id("get-started").click()
    tap_text(page, "Yes, I'm here")
    page.get_by_test_id("quiz-next").click()
    page.get_by_test_id("quiz-name").fill(name or f"VERIFY-APP {who}")
    if shots:
        shot(page, "quiz-name")
    page.get_by_test_id("quiz-next").click()
    # Friends first; romance is an opt-in switch (off), so no relationship questions follow.
    page.get_by_text("What are you looking for here?").wait_for()
    tap_text(page, "Collaborators")
    tap_text(page, "Co-founder")
    tap_text(page, "Friends")
    if shots:
        shot(page, "quiz-looking")
    page.get_by_test_id("quiz-next").click()
    page.get_by_text("Your interests").wait_for()
    for chip in ("AI", "Startups", "Building/hacking", "Surfing/beach", "Nature"):
        tap_text(page, chip)
    if shots:
        shot(page, "quiz-interests")
    page.get_by_test_id("quiz-next").click()
    page.get_by_test_id("quiz-bio").fill("Building AI agent tools for startups, here for sunrise surf and good convos")
    page.get_by_test_id("quiz-next").click()
    page.get_by_test_id("quiz-telegram").fill(handle or f"verifyapp_{who.lower()}")
    if shots:
        shot(page, "quiz-telegram")
    page.get_by_test_id("quiz-next").click()
    page.get_by_text("Add a photo of you").wait_for()
    if photo:
        with page.expect_file_chooser() as fc:
            page.get_by_test_id("add-photo").click()
        fc.value.set_files(photo)
        page.get_by_label("Remove photo 1").wait_for(timeout=20000)
    if shots:
        shot(page, "quiz-photos", 1000)
    page.get_by_test_id("quiz-next").click()
    page.get_by_text("Almost there").wait_for()
    tap_text(page, "Paste what your own AI agent says about you")
    page.get_by_placeholder("Paste your agent's answer here").fill(AGENT_PROFILES[who])
    page.get_by_placeholder("Agent name (optional)").fill(f"{who}bot")
    if shots:
        shot(page, "quiz-agent")
    page.get_by_test_id("quiz-next").click()
    page.get_by_text("One last thing").wait_for()
    page.get_by_test_id("quiz-terms").click()
    if shots:
        shot(page, "quiz-terms")
    page.get_by_test_id("quiz-next").click()
    page.get_by_test_id("quiz-submit").wait_for()
    if shots:
        shot(page, "quiz-summary")
    page.get_by_test_id("quiz-submit").click()
    page.get_by_test_id("ready-send").wait_for(timeout=90000)
    if shots:
        shot(page, "ready", 1200)
    notes = [t.inner_text() for t in page.get_by_test_id("photo-note").all()]
    if notes:
        print("photo notes:", notes)
    return notes


def wait_until(fn, timeout, every=5):
    end = time.time() + timeout
    while time.time() < end:
        v = fn()
        if v:
            return v
        time.sleep(every)
    return None


def main():
    baseline = get("/api/public/stats")
    print("baseline stats", baseline)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx_a, a, log_a = phone(browser, "light")
        ctx_b, b, log_b = phone(browser, "dark")
        tok = {}
        try:
            # --- Sign-ups -------------------------------------------------------------------------
            notes = sign_up(a, "Ada", shots=True, photo=NOT_A_PERSON)
            assert notes and not notes[0].endswith("added."), "expected the moderation to refuse the non-person photo"
            a.get_by_text("Not now, take me home").click()
            a.get_by_test_id("send-dates").wait_for(timeout=30000)
            tok["a"] = token_of(a)
            shot(a, "home-top-pick", 2500)

            sign_up(b, "Bo", shots=False)
            tok["b"] = token_of(b) or None
            stats = get("/api/public/stats")
            print("stats after sign-ups", stats)
            if stats["agents"] != baseline["agents"] + 2:
                raise SystemExit("Other residents exist; refusing to send dates that could reach real people.")
            # B's agent chats with A's (the only other resident): "Send my agent to meet people" on the Ready screen.
            b.get_by_test_id("ready-send").click()
            b.get_by_test_id("send-dates").wait_for(timeout=30000)
            tok["b"] = token_of(b)
            shot(b, "home-running-dark", 2500)

            # --- Wait for the date to finish --------------------------------------------------------
            me_b = wait_until(lambda: (lambda m: m if m["running"] == 0 else None)(get("/api/me?full=1", tok["b"])), 240)
            me_a = get("/api/me?full=1", tok["a"])
            print("B recs", len(me_b["recommendations"]), "A recs", len(me_a["recommendations"]))
            if not me_b["recommendations"] or not me_a["recommendations"]:
                print("An agent did not recommend; no mutual match possible for this pair.")

            # --- Recommendations and decisions --------------------------------------------------------
            b.reload()
            b.get_by_test_id("send-dates").wait_for(timeout=30000)
            shot(b, "home-recommendation-dark", 2500)
            a.reload()
            a.get_by_test_id("send-dates").wait_for(timeout=30000)
            shot(a, "home-recommendation", 2500)

            # A opens the report/block menu on the hero to show it, then cancels.
            if me_a["recommendations"]:
                a.get_by_label("Report or block VERIFY-APP Bo").first.click()
                shot(a, "safety-menu")
                tap_text(a, "Cancel")

            # Both say yes: the round Yes button, then the confirmation sheet (answers are final).
            if me_b["recommendations"]:
                b.get_by_test_id("decide-yes").click()
                shot(b, "confirm-yes-dark", 600)
                tap_text(b, "Yes, I'd meet")
                b.wait_for_timeout(2500)
            if me_a["recommendations"]:
                a.get_by_test_id("decide-yes").click()
                tap_text(a, "Yes, I'd meet")
                a.get_by_text("You're connected").wait_for(timeout=20000)
                shot(a, "match-celebration", 900)
                tap_text(a, "Keep going")

            # --- Matches ----------------------------------------------------------------------------
            a.goto(APP + "/matches")
            a.wait_for_timeout(2500)
            shot(a, "matches", 1500)
            if a.get_by_text("Your agents' chat").count():
                a.get_by_text("Your agents' chat").first.click()
                shot(a, "match-transcript", 2000)
                a.go_back()
            b.goto(APP + "/matches")
            shot(b, "matches-dark", 3000)

            # --- Board, Me, Edit ----------------------------------------------------------------------
            a.goto(APP + "/board")
            shot(a, "board", 3000)
            a.goto(APP + "/me")
            a.get_by_test_id("edit-profile").wait_for(timeout=20000)
            shot(a, "me", 1500)
            a.get_by_test_id("edit-profile").click()
            a.get_by_test_id("quiz-submit").wait_for(timeout=20000)
            shot(a, "edit-profile")
            a.get_by_label("Change One line").click()
            a.get_by_test_id("quiz-bio").fill("Building AI agent tools, here for sunrise surf (edited in the app)")
            a.get_by_test_id("quiz-next").click()
            a.get_by_test_id("quiz-submit").click()
            a.get_by_test_id("edit-profile").wait_for(timeout=20000)
            a.wait_for_timeout(1500)
            assert "edited in the app" in get("/api/me?full=1", tok["a"])["profile"]["bio"], "profile edit did not save"
            print("profile edit saved")

            # --- Messages: A writes, B reads (unread badge) and replies, A sees it (4 s poll) --------
            a.goto(APP + "/messages")
            a.get_by_text("VERIFY-APP Bo").first.wait_for(timeout=30000)
            shot(a, "inbox", 1200)
            a.get_by_text("VERIFY-APP Bo").first.click()
            a.get_by_test_id("chat-input").wait_for(timeout=30000)
            a.get_by_test_id("chat-input").fill("Hi Bo! Our agents say sunrise surf at Ashvem. Tomorrow 6:30?")
            a.get_by_test_id("chat-send").click()
            a.get_by_text("Tomorrow 6:30?", exact=False).first.wait_for(timeout=20000)
            b.goto(APP + "/messages")
            b.get_by_text("1", exact=True).first.wait_for(timeout=40000)
            shot(b, "inbox-unread-dark", 800)
            b.get_by_text("VERIFY-APP Ada").first.click()
            b.get_by_text("Tomorrow 6:30?", exact=False).first.wait_for(timeout=20000)
            b.get_by_test_id("chat-input").fill("Yes! See you at the Ashvem lifeguard tower 🌅")
            b.get_by_test_id("chat-send").click()
            a.get_by_text("lifeguard tower", exact=False).first.wait_for(timeout=20000)
            shot(a, "chat", 800)
            print("message exchange ok")

            # --- Unmatch from the chat menu; B's open chat turns into "This chat has ended." -------
            a.get_by_label("More for VERIFY-APP Bo").click()
            shot(a, "chat-menu", 500)
            a.get_by_text("Unmatch VERIFY-APP Bo", exact=True).click()
            a.get_by_text("Unmatch", exact=True).last.click()
            b.get_by_test_id("chat-ended").wait_for(timeout=30000)
            shot(b, "chat-ended-dark", 500)
            print("unmatch ok")

            # --- Sign out / sign in with the private link -------------------------------------------
            a.goto(APP + "/me")
            a.get_by_test_id("sign-out").wait_for(timeout=20000)
            a.get_by_test_id("sign-out").click()
            a.get_by_text("Sign out", exact=True).last.click()
            a.get_by_test_id("get-started").wait_for(timeout=20000)
            a.get_by_text("I already have a private link").click()
            a.get_by_test_id("sign-in-input").fill(f"{API}/u/{tok['a']}")
            shot(a, "sign-in")
            a.get_by_test_id("sign-in-submit").click()
            a.get_by_test_id("send-dates").wait_for(timeout=30000)
            print("signed back in with the private link")
        finally:
            # --- Delete both accounts through the app (API fallback if the UI path fails) ----------
            for name, page in (("a", a), ("b", b)):
                if not tok.get(name):
                    continue
                try:
                    page.goto(APP + "/me")
                    page.get_by_test_id("delete-account").wait_for(timeout=20000)
                    page.get_by_test_id("delete-account").click()
                    if name == "a":
                        shot(page, "delete-confirm", 600)
                    tap_text(page, "Delete my account")
                    page.get_by_test_id("get-started").wait_for(timeout=30000)
                    print("deleted", name, "via app")
                except Exception as e:  # noqa: BLE001
                    print("UI delete failed for", name, type(e).__name__)
                    req = urllib.request.Request(API + "/api/me", method="DELETE", headers={"authorization": f"Bearer {tok[name]}"})
                    urllib.request.urlopen(req, timeout=30).read()
                    print("deleted", name, "via API")
            for label, log in (("A", log_a), ("B", log_b)):
                bad = [l for l in log if l[0] in ("PAGEERROR", "CONSOLE") or (isinstance(l[2], int) and l[2] >= 500)]
                print(label, "requests", len(log), "problems", bad[:8])
            ctx_a.close()
            ctx_b.close()
            browser.close()
    print("final stats", get("/api/public/stats"), "baseline", baseline)


if __name__ == "__main__":
    main()
