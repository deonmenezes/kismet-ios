"""Store screenshots with obviously-demo residents ("Maya (demo)", "Arjun (demo)") on throwaway production
accounts, deleted at the end. Output: screens/store/*.png (393x852 @3x = 1179x2556)."""
import os
import sys
import time
import urllib.request

from playwright.sync_api import sync_playwright

sys.path.insert(0, "tools")
from e2e import get, token_of, wait_until  # noqa: E402
from e2e_lib import API, APP, phone  # noqa: E402

OUT = "screens/store"
PEOPLE = {
    "maya": {
        "name": "Maya (demo)", "tg": "maya_demo_ad", "bio": "Designing a climate app, here for sunrise swims and good conversations",
        "interests": ["AI", "Startups", "Art", "Surfing/beach", "Nature"], "agent": "Mayabot",
        "profile": "I'm Maya, a product designer building a climate app. In the village I'd love to find a technical co-founder or "
        "collaborator who cares about design, and friends for sunrise swims at Mandrem. Warm, curious, a little nerdy about typography.",
    },
    "arjun": {
        "name": "Arjun (demo)", "tg": "arjun_demo_ad", "bio": "Engineer building AI tools for climate startups, always up for a beach walk",
        "interests": ["AI", "Startups", "Building/hacking", "Surfing/beach", "Nature"], "agent": "Arjunbot",
        "profile": "I'm Arjun, an engineer building AI tools for climate startups. In the village I'm looking for a design-minded "
        "co-founder or collaborator, and people to surf and walk the beach with at sunrise. Calm, practical, loves shipping.",
    },
}


def shot(page, name, wait=900):
    page.wait_for_timeout(wait)
    page.screenshot(path=f"{OUT}/{name}.png")
    print("shot", name)


def quiz(page, who, shoot_interests=False):
    p = PEOPLE[who]
    page.goto(APP + "/")
    page.get_by_test_id("get-started").click()
    page.get_by_text("Yes, I'm here", exact=True).click()
    page.get_by_test_id("quiz-next").click()
    page.get_by_test_id("quiz-name").fill(p["name"])
    page.get_by_test_id("quiz-next").click()
    page.get_by_text("What are you looking for here?").wait_for()
    for o in ("Friends", "Collaborators", "Co-founder"):
        page.get_by_text(o, exact=True).click()
    page.get_by_test_id("quiz-next").click()
    page.get_by_text("Your interests").wait_for()
    for i in p["interests"]:
        page.get_by_text(i, exact=True).first.click()
    if shoot_interests:
        shot(page, "4-quiz-interests")
    page.get_by_test_id("quiz-next").click()
    page.get_by_test_id("quiz-bio").fill(p["bio"])
    page.get_by_test_id("quiz-next").click()
    page.get_by_test_id("quiz-telegram").fill(p["tg"])
    page.get_by_test_id("quiz-next").click()
    page.get_by_text("Add a photo of you").wait_for()
    page.get_by_test_id("quiz-next").click()
    page.get_by_text("Almost there").wait_for()
    page.get_by_text("Paste what your own AI agent says about you").click()
    page.get_by_placeholder("Paste your agent's answer here").fill(p["profile"])
    page.get_by_placeholder("Agent name (optional)").fill(p["agent"])
    page.get_by_test_id("quiz-next").click()
    page.get_by_test_id("quiz-terms").click()
    page.get_by_test_id("quiz-next").click()
    page.get_by_test_id("quiz-submit").click()
    page.get_by_test_id("ready-send").wait_for(timeout=90000)
    page.get_by_text("Not now, take me home").click()
    page.get_by_test_id("send-dates").wait_for(timeout=30000)
    return token_of(page)


def main():
    os.makedirs(OUT, exist_ok=True)
    baseline = get("/api/public/stats")
    print("baseline", baseline)
    tok = {}
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        ctx_m, m, _ = phone(browser, "light")
        ctx_a, a, _ = phone(browser, "light")
        try:
            tok["m"] = quiz(m, "maya", shoot_interests=True)
            tok["a"] = quiz(a, "arjun")
            if get("/api/public/stats")["agents"] != baseline["agents"] + 2:
                raise SystemExit("Other residents exist; not sending dates.")
            a.reload()
            a.get_by_test_id("date-top-pick").wait_for(timeout=30000)
            a.get_by_test_id("date-top-pick").click()
            a.get_by_text("Your agent is in 1 chat").wait_for(timeout=30000)
            shot(a, "5-running", 2500)
            wait_until(lambda: get("/api/me?full=1", tok["a"])["running"] == 0, 240)
            me_m, me_a = get("/api/me?full=1", tok["m"]), get("/api/me?full=1", tok["a"])
            if not (me_m["recommendations"] and me_a["recommendations"]):
                raise SystemExit("Not mutually recommended this time; no match screenshots.")
            m.reload()
            m.get_by_test_id("decide-yes").wait_for(timeout=30000)
            shot(m, "1-recommendation", 2000)
            a.reload()
            a.get_by_test_id("decide-yes").wait_for(timeout=30000)
            a.get_by_test_id("decide-yes").click()
            a.get_by_text("Yes, I'd meet", exact=True).click()
            a.wait_for_timeout(2500)
            m.get_by_test_id("decide-yes").click()
            m.get_by_text("Yes, I'd meet", exact=True).click()
            m.get_by_text("You're connected").wait_for(timeout=20000)
            shot(m, "2-match", 900)
            m.get_by_text("Keep going").click()
            # A short chat for the Messages screenshot.
            a.goto(APP + "/messages")
            a.get_by_label("Chat with Maya (demo)").first.click()
            a.get_by_test_id("chat-input").fill("Hi Maya! Our agents think we'd build well together. Sunrise swim at Mandrem tomorrow?")
            a.get_by_test_id("chat-send").click()
            a.get_by_text("Sunrise swim", exact=False).last.wait_for(timeout=20000)
            m.goto(APP + "/messages")
            m.get_by_label("Chat with Arjun (demo)").first.click()
            m.get_by_text("Sunrise swim", exact=False).last.wait_for(timeout=20000)
            m.get_by_test_id("chat-input").fill("Yes! 6:30 by the lifeguard tower? I'll bring my climate app sketches 🌅")
            m.get_by_test_id("chat-send").click()
            a.get_by_text("lifeguard tower", exact=False).last.wait_for(timeout=20000)
            m.wait_for_timeout(1000)
            shot(m, "3-chat", 600)
        except Exception:
            m.screenshot(path=f"{OUT}/_debug-maya.png")
            a.screenshot(path=f"{OUT}/_debug-arjun.png")
            raise
        finally:
            for k, page in (("m", m), ("a", a)):
                if not tok.get(k):
                    continue
                try:
                    page.goto(APP + "/me")
                    page.get_by_test_id("delete-account").wait_for(timeout=30000)
                    page.get_by_test_id("delete-account").click()
                    page.get_by_text("Delete my account").click()
                    page.get_by_test_id("get-started").wait_for(timeout=30000)
                    print("deleted", k)
                except Exception as e:  # noqa: BLE001
                    print("UI delete failed", k, type(e).__name__)
                    req = urllib.request.Request(API + "/api/me", method="DELETE", headers={"authorization": f"Bearer {tok[k]}"})
                    urllib.request.urlopen(req, timeout=30).read()
                    print("deleted via API", k)
            ctx_m.close()
            ctx_a.close()
            browser.close()
    time.sleep(2)
    print("final", get("/api/public/stats"), "baseline", baseline)


if __name__ == "__main__":
    main()
