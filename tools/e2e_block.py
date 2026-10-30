"""Second production run: top-pick card, running state, block + unblock from a recommendation, offline/error
state with retry, sign out and back in with the private link, then delete both VERIFY-APP accounts in the app."""
import sys
import time
import urllib.request

from playwright.sync_api import sync_playwright

sys.path.insert(0, "tools")
from e2e import get, sign_up, tap_text, token_of, wait_until  # noqa: E402
from e2e_lib import API, APP, phone  # noqa: E402


def shot(page, name, wait=700):
    page.wait_for_timeout(wait)
    page.screenshot(path=f"screens/{name}.png")
    print("shot", name)


def main():
    baseline = get("/api/public/stats")
    print("baseline stats", baseline)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx_c, c, log_c = phone(browser, "light")
        ctx_d, d, log_d = phone(browser, "light")
        tok = {}
        try:
            sign_up(c, "Ada", shots=False)  # same compatible profile text, different names below
            c.get_by_text("Not now, take me home").click()
            c.get_by_test_id("send-dates").wait_for(timeout=30000)
            tok["c"] = token_of(c)
            sign_up(d, "Bo", shots=False)
            d.get_by_text("Not now, take me home").click()
            d.get_by_test_id("send-dates").wait_for(timeout=30000)
            tok["d"] = token_of(d)
            stats = get("/api/public/stats")
            if stats["agents"] != baseline["agents"] + 2:
                raise SystemExit("Other residents exist; refusing to send dates that could reach real people.")

            # C's agent's top pick (no date yet) -> C sends its agent on that date.
            c.reload()
            c.get_by_test_id("date-top-pick").wait_for(timeout=30000)
            shot(c, "30-home-top-pick", 1500)
            c.get_by_test_id("date-top-pick").click()
            c.get_by_text("Your agent is on 1 date").wait_for(timeout=30000)
            shot(c, "31-home-running", 1500)
            wait_until(lambda: get("/api/me?full=1", tok["c"])["running"] == 0, 240)
            me_c = get("/api/me?full=1", tok["c"])
            me_d = get("/api/me?full=1", tok["d"])
            print("C recs", len(me_c["recommendations"]), "D recs", len(me_d["recommendations"]))

            # Block + unblock from a recommendation (whichever side was recommended).
            page, other = (c, "VERIFY-APP Bo") if me_c["recommendations"] else (d, "VERIFY-APP Ada")
            if me_c["recommendations"] or me_d["recommendations"]:
                page.reload()
                page.get_by_label(f"Report or block {other}").first.wait_for(timeout=30000)
                page.get_by_label(f"Report or block {other}").first.click()
                tap_text(page, f"Block {other}")
                page.get_by_text(f"Block {other}?").wait_for()
                shot(page, "32-block-confirm", 400)
                page.get_by_text("Block", exact=True).last.click()
                page.wait_for_timeout(2500)
                shot(page, "33-after-block", 200)
                page.goto(APP + "/me/blocked")
                page.get_by_text("Unblock").first.wait_for(timeout=30000)
                shot(page, "34-blocked-list", 800)
                page.get_by_text("Unblock").first.click()
                page.get_by_text("Unblock", exact=True).last.click()
                page.wait_for_timeout(3000)
                shot(page, "35-after-unblock", 200)
                # Report from the recommendation (a report also blocks for good).
                page.goto(APP + "/")
                page.get_by_label(f"Report or block {other}").first.wait_for(timeout=30000)
                page.get_by_label(f"Report or block {other}").first.click()
                page.get_by_text(f"Report {other}", exact=True).click()
                page.get_by_text("What happened?").wait_for(timeout=15000)
                page.get_by_text("Fake profile", exact=True).click()
                page.get_by_placeholder("Anything else we should know? (optional)").fill("VERIFY-APP automated test report, please ignore.")
                shot(page, "38-report", 300)
                page.get_by_test_id("report-submit").click()
                page.wait_for_timeout(3000)
                page.goto(APP + "/me/blocked")
                page.get_by_text("Reported", exact=False).first.wait_for(timeout=30000)
                print("report ok (person listed as reported)")
            else:
                print("No recommendation on either side; block from a recommendation not exercised.")

            # Error state with retry: the board request fails, then recovers.
            c.goto(APP + "/")
            c.get_by_test_id("send-dates").wait_for(timeout=30000)
            c.route(f"{API}/api/public/board**", lambda r: r.abort())
            c.get_by_role("tab", name="Board").click()
            c.get_by_text("Try again").last.wait_for(timeout=30000)
            shot(c, "36-error-state", 300)
            c.unroute(f"{API}/api/public/board**")
            c.get_by_text("Try again").last.click()
            c.get_by_text("Village Board").first.wait_for(timeout=30000)
            c.wait_for_timeout(2500)
            print("board recovered after retry:", c.get_by_text("agents", exact=True).count() > 0)

            # Sign out, then back in with the private link.
            c.goto(APP + "/me")
            c.get_by_test_id("sign-out").wait_for(timeout=30000)
            c.get_by_test_id("sign-out").click()
            c.get_by_text("Sign out", exact=True).last.click()
            c.get_by_test_id("get-started").wait_for(timeout=30000)
            c.get_by_text("I already have a private link").click()
            c.get_by_test_id("sign-in-input").fill("not a link")
            c.get_by_test_id("sign-in-submit").click()
            c.wait_for_timeout(500)
            c.get_by_test_id("sign-in-input").fill(f"{API}/u/{tok['c']}")
            shot(c, "37-sign-in", 300)
            c.get_by_test_id("sign-in-submit").click()
            c.get_by_test_id("send-dates").wait_for(timeout=30000)
            print("signed back in with the private link")
        finally:
            for name, page in (("c", c), ("d", d)):
                if not tok.get(name):
                    continue
                try:
                    page.goto(APP + "/me")
                    page.get_by_test_id("delete-account").wait_for(timeout=30000)
                    page.get_by_test_id("delete-account").click()
                    page.get_by_text("Delete my account").click()
                    page.get_by_test_id("get-started").wait_for(timeout=30000)
                    print("deleted", name, "via app")
                except Exception as e:  # noqa: BLE001
                    print("UI delete failed for", name, type(e).__name__)
                    req = urllib.request.Request(API + "/api/me", method="DELETE", headers={"authorization": f"Bearer {tok[name]}"})
                    urllib.request.urlopen(req, timeout=30).read()
                    print("deleted", name, "via API")
            for label, log in (("C", log_c), ("D", log_d)):
                bad = [l for l in log if l[0] in ("PAGEERROR", "CONSOLE") or (isinstance(l[2], int) and l[2] >= 500)]
                print(label, "requests", len(log), "problems", bad[:8])
            ctx_c.close()
            ctx_d.close()
            browser.close()
    time.sleep(2)
    print("final stats", get("/api/public/stats"), "baseline", baseline)


if __name__ == "__main__":
    main()
