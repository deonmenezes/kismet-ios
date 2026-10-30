"""Shared Playwright helpers: a phone-sized page whose API calls go to production with CORS added
(the backend has no CORS headers; native apps don't need them, a browser does)."""
import json

API = "https://agent-dates.vercel.app"
APP = "http://127.0.0.1:8790"
CORS = {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "authorization, content-type, accept",
    "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
}


def phone(browser, scheme="light"):
    ctx = browser.new_context(viewport={"width": 393, "height": 852}, device_scale_factor=3, is_mobile=True, has_touch=True, color_scheme=scheme)
    page = ctx.new_page()
    log = []

    def proxy(route):
        req = route.request
        if req.method == "OPTIONS":
            return route.fulfill(status=204, headers=CORS)
        resp = route.fetch()
        headers = {k: v for k, v in resp.headers.items() if k.lower() not in ("content-encoding", "content-length", "transfer-encoding")}
        headers.update(CORS)
        log.append((req.method, req.url.replace(API, ""), resp.status))
        route.fulfill(status=resp.status, headers=headers, body=resp.body())

    page.route(f"{API}/api/**", proxy)
    page.on("pageerror", lambda e: log.append(("PAGEERROR", str(e), 0)))
    page.on("console", lambda m: m.type == "error" and log.append(("CONSOLE", m.text[:300], 0)))
    return ctx, page, log
