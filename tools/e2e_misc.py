"""Third production run (no dates): offline/error state with retry, bad and good private-link sign-in, delete."""
import sys
import urllib.request

from playwright.sync_api import sync_playwright

sys.path.insert(0, "tools")
from e2e import get, sign_up, token_of  # noqa: E402
from e2e_lib import API, APP, phone  # noqa: E402


def shot(page, name, wait=700):
    page.wait_for_timeout(wait)
    page.screenshot(path=f"screens/{name}.png")
    print("shot", name)


baseline = get("/api/public/stats")
print("baseline stats", baseline)
with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx, c, log = phone(browser, "dark")
    tok = None
    try:
        sign_up(c, "Ada", shots=False)
        c.get_by_text("Not now, take me home").click()
        c.get_by_test_id("send-dates").wait_for(timeout=30000)
        tok = token_of(c)
        c.route(f"{API}/api/public/board**", lambda r: r.abort())
        c.get_by_role("tab", name="Board").click()
        c.get_by_text("Try again").last.wait_for(timeout=30000)
        shot(c, "36-error-state-dark", 300)
        c.unroute(f"{API}/api/public/board**")
        c.get_by_text("Try again").last.click()
        c.get_by_text("matches", exact=True).first.wait_for(timeout=30000)
        print("board recovered after retry")
        c.goto(APP + "/me")
        c.get_by_test_id("sign-out").wait_for(timeout=30000)
        c.get_by_test_id("sign-out").click()
        c.get_by_text("Sign out", exact=True).last.click()
        c.get_by_test_id("get-started").wait_for(timeout=30000)
        c.get_by_text("I already have a private link").click()
        c.get_by_test_id("sign-in-input").fill("not a link")
        c.get_by_test_id("sign-in-submit").click()
        c.get_by_text("doesn't look like a private link", exact=False).wait_for(timeout=10000)
        shot(c, "37-sign-in-error-dark", 300)
        c.get_by_test_id("sign-in-input").fill(f"{API}/u/{tok}")
        c.get_by_test_id("sign-in-submit").click()
        c.get_by_test_id("send-dates").wait_for(timeout=30000)
        print("signed back in with the private link")
    finally:
        if tok:
            try:
                c.goto(APP + "/me")
                c.get_by_test_id("delete-account").wait_for(timeout=30000)
                c.get_by_test_id("delete-account").click()
                c.get_by_text("Delete my account").click()
                c.get_by_test_id("get-started").wait_for(timeout=30000)
                print("deleted via app")
            except Exception as e:  # noqa: BLE001
                print("UI delete failed", type(e).__name__)
                req = urllib.request.Request(API + "/api/me", method="DELETE", headers={"authorization": f"Bearer {tok}"})
                urllib.request.urlopen(req, timeout=30).read()
                print("deleted via API")
        print("problems", [l for l in log if l[0] == "PAGEERROR" or (isinstance(l[2], int) and l[2] >= 500)][:5])
        ctx.close()
        browser.close()
print("final stats", get("/api/public/stats"), "baseline", baseline)
