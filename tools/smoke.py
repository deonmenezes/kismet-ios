import sys
from playwright.sync_api import sync_playwright
sys.path.insert(0, "tools")
from e2e_lib import APP, phone

with sync_playwright() as p:
    b = p.chromium.launch()
    for scheme in ("light", "dark"):
        ctx, page, log = phone(b, scheme)
        page.goto(APP + "/")
        page.wait_for_timeout(3500)
        page.screenshot(path=f"screens/_smoke-welcome-{scheme}.png")
        print(scheme, page.url, log)
        ctx.close()
    b.close()
