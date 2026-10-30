"""Demo residents for App Review and the store screenshots, on production, via the same /api/signup the app's
quiz calls. Clearly named "(demo)". Sends dates only between these demo accounts (targetId), never to anyone else.

  python tools/demo_review.py create      -> writes tools/.demo-accounts.json (git-ignored), prints the private links
  python tools/demo_review.py dates       -> partners' agents date the reviewer's agent; waits for verdicts
  python tools/demo_review.py more        -> the extra partners (leo, zara) date the reviewer too
  python tools/demo_review.py status      -> read-only: is each link still valid, its matches and blocks
  python tools/demo_review.py status --full -> also recommendations, via GET /api/me (NOT read-only, see below)
  python tools/demo_review.py delete      -> deletes every demo account in the file

The backend only makes "(demo)" accounts with the demo sign-up key (X-Kismet-Demo-Key = the server's DEMO_SIGNUP_KEY):
"create" reads it from $KISMET_DEMO_SIGNUP_KEY (or $DEMO_SIGNUP_KEY), else secrets/demo_signup_key.txt (git-ignored),
and stops before any request if neither is there. The key is never printed. Only "create" needs it.

GET /api/me (also /api/me/summary and /recommendations) is not read-only: it may start the account's daily dates and
marks recommendations as shown. Plain "status" uses only /api/me/inbox and /api/me/blocks, which change nothing.
"""
import os
import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

API = "https://agent-dates.vercel.app"
FILE = Path(__file__).parent / ".demo-accounts.json"
KEY_FILE = Path(__file__).resolve().parent.parent / "secrets" / "demo_signup_key.txt"

BASE = {"relStatus": "undisclosed", "openness": None, "gender": None, "interestedIn": None, "agentPersonality": "",
        "publicQuotes": False, "xHandle": "", "useXPhoto": False, "agreedToTerms": True, "ageConfirmed": True,
        # Kismet is for village residents only (the API's edgeCity): the demo residents are members, so App Review sees the full app.
        "edgeCity": True}
PEOPLE = {
    "reviewer": {
        "name": "Sam (demo)", "telegram": "kismet_review_demo", "lookingFor": ["friends", "collaborators", "cofounder"],
        "interests": ["AI", "Startups", "Surfing/beach", "Nature", "Books"], "agentName": "Sambot",
        "bio": "Demo profile for App Review: building an AI travel app, here for sunrise swims and long talks",
        "agentProfile": "I'm Sam, a founder building an AI travel planning app. In the village I'd love to meet designers and engineers "
        "to build with, and friends for sunrise swims and beach walks at Mandrem. Curious, warm, reads a lot of sci-fi.",
    },
    "maya": {
        "name": "Maya (demo)", "telegram": "maya_demo_kismet", "lookingFor": ["friends", "collaborators", "cofounder"],
        "interests": ["AI", "Startups", "Art", "Surfing/beach", "Nature"], "agentName": "Mayabot",
        "bio": "Designing a climate app, here for sunrise swims and good conversations",
        "agentProfile": "I'm Maya, a product designer building a climate app. In the village I'd love to find a technical co-founder or "
        "collaborator who cares about design, and friends for sunrise swims at Mandrem. Warm, curious, a little nerdy about typography.",
    },
    "arjun": {
        "name": "Arjun (demo)", "telegram": "arjun_demo_kismet", "lookingFor": ["friends", "collaborators", "cofounder"],
        "interests": ["AI", "Startups", "Building/hacking", "Surfing/beach", "Books"], "agentName": "Arjunbot",
        "bio": "Engineer building AI tools for climate startups, always up for a beach walk",
        "agentProfile": "I'm Arjun, an engineer building AI tools for climate startups. In the village I'm looking for a design-minded "
        "co-founder or collaborator, and people to surf and walk the beach with at sunrise. Calm, practical, loves shipping.",
    },
    "priya": {
        "name": "Priya (demo)", "telegram": "priya_demo_kismet", "lookingFor": ["friends", "adventure", "collaborators"],
        "interests": ["AI", "Books", "Nature", "Travel", "Photography"], "agentName": "Priyabot",
        "bio": "Writer and photographer, planning a sunrise hike and a book swap",
        "agentProfile": "I'm Priya, a writer and photographer documenting how founders travel and work. In the village I want "
        "adventure buddies for sunrise hikes, a book swap crew, and people building thoughtful AI products to interview.",
    },
    "leo": {
        "name": "Leo (demo)", "telegram": "leo_demo_kismet", "lookingFor": ["friends", "collaborators", "adventure"],
        "interests": ["AI", "Startups", "Surfing/beach", "Music", "Travel"], "agentName": "Leobot",
        "bio": "Surf instructor turned founder, building a booking app for surf schools",
        "agentProfile": "I'm Leo, a surf instructor who now builds a booking app for surf schools along the Goa coast. In the village "
        "I want people to build with, travellers to surf with at sunrise, and anyone who wants a first lesson.",
    },
    "zara": {
        "name": "Zara (demo)", "telegram": "zara_demo_kismet", "lookingFor": ["friends", "collaborators", "cofounder"],
        "interests": ["AI", "Startups", "Books", "Nature", "Philosophy"], "agentName": "Zarabot",
        "bio": "ML researcher, reading group host, early riser",
        "agentProfile": "I'm Zara, an ML researcher working on travel recommendation models. In the village I host a sunrise "
        "reading group on the beach and I'm looking for founders who want to turn research into products.",
    },
}

PARTNERS = ("maya", "arjun", "priya", "leo", "zara")


def demo_key():
    """The demo sign-up key from the environment or secrets/demo_signup_key.txt; exits with a clear message if missing."""
    key = (os.environ.get("KISMET_DEMO_SIGNUP_KEY") or os.environ.get("DEMO_SIGNUP_KEY") or "").strip()
    if not key and KEY_FILE.exists():
        key = KEY_FILE.read_text(encoding="utf-8").strip()
    if not key:
        raise SystemExit(
            "No demo sign-up key: set KISMET_DEMO_SIGNUP_KEY, or put the key in "
            f"{KEY_FILE} (git-ignored). Without it the backend refuses \"(demo)\" sign-ups."
        )
    if len(key) < 24:
        raise SystemExit(f"The demo sign-up key looks wrong ({len(key)} characters; the server wants 24 or more).")
    return key


def call(path, token=None, method="GET", body=None, headers=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(API + path, data=data, method=method)
    req.add_header("accept", "application/json")
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    if data:
        req.add_header("content-type", "application/json")
    if token:
        req.add_header("authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            raw = r.read()
            return r.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw)
        except Exception:  # noqa: BLE001
            return e.code, raw.decode(errors="replace")


def load():
    return json.loads(FILE.read_text()) if FILE.exists() else {}


def me(token):
    return call("/api/me?full=1", token)[1]


def main(cmd):
    if cmd not in ("create", "dates", "more", "status", "delete"):
        raise SystemExit(f"Unknown command {cmd!r}. Use create, dates, more, status [--full] or delete.")
    acc = load()
    if cmd != "create" and not acc:
        raise SystemExit(f"No demo accounts file at {FILE}. Run 'create' first (or copy the file from the machine that made them).")
    if cmd == "create":
        headers = {"x-kismet-demo-key": demo_key()}
        for key, p in PEOPLE.items():
            if key in acc:
                continue
            status, r = call("/api/signup", method="POST", body={**BASE, **p}, headers=headers)
            if status != 201:
                raise SystemExit(f"signup {key}: {status} {r}")
            acc[key] = {"token": r["token"], "privateLink": r["privateLink"], "name": p["name"]}
            FILE.write_text(json.dumps(acc, indent=2))
            print("created", key, r["privateLink"])
        # user ids: the reviewer's id as the partners' target (topPick.targetId when not dated yet)
    elif cmd == "dates":
        rid = None
        for key in ("maya", "arjun", "priya"):
            pick = (me(acc[key]["token"]) or {}).get("topPick") or {}
            print(key, "topPick", pick.get("name"), pick.get("targetId"))
        # Each partner dates the reviewer explicitly: find the reviewer's id through a partner's ranking.
        for key in ("maya", "arjun", "priya"):
            m = me(acc[key]["token"])
            pick = m.get("topPick") or {}
            if pick.get("name") == PEOPLE["reviewer"]["name"] and pick.get("targetId"):
                rid = pick["targetId"]
            target = rid or acc.get("reviewerId")
            if not target:
                print(key, "top pick is not the reviewer; skipping")
                continue
            acc["reviewerId"] = target
            FILE.write_text(json.dumps(acc, indent=2))
            print(key, "->", call("/api/me/dates", acc[key]["token"], "POST", {"targetId": target}))
        deadline = time.time() + 300
        while time.time() < deadline:
            running = sum((me(acc[k]["token"]) or {}).get("running", 0) for k in ("maya", "arjun", "priya"))
            if not running:
                break
            time.sleep(10)
        main("status")
    elif cmd == "more":
        # New partners date the reviewer (the reviewer's id is saved by "dates").
        for key in PARTNERS:
            if key in ("maya", "arjun", "priya"):
                continue
            print(key, "->", call("/api/me/dates", acc[key]["token"], "POST", {"targetId": acc["reviewerId"]}))
        deadline = time.time() + 300
        while time.time() < deadline and sum((me(acc[k]["token"]) or {}).get("running", 0) for k in PARTNERS if k in acc):
            time.sleep(10)
        main("status")
    elif cmd == "status":
        full = "--full" in sys.argv[2:]
        for key, a in acc.items():
            if not isinstance(a, dict):
                continue
            if full:
                m = me(a["token"]) or {}
                print(key, "running", m.get("running"), "recs", [r["name"] for r in m.get("recommendations", [])],
                      "matches", [x["name"] for x in m.get("matches", [])])
                continue
            code, inbox = call("/api/me/inbox", a["token"])
            if code != 200:
                print(key, a.get("name"), "-> link NOT valid" if code == 401 else f"-> error {code}")
                continue
            _, blocks = call("/api/me/blocks", a["token"])
            convs = (inbox or {}).get("conversations", [])
            print(key, a.get("name"), "ok", "matches", [f"{c['name']} ({c['unread']} unread)" for c in convs],
                  "blocks", len((blocks or {}).get("blocks", []) if isinstance(blocks, dict) else []))
    elif cmd == "delete":
        for key, a in list(acc.items()):
            if isinstance(a, dict):
                print("delete", key, call("/api/me", a["token"], "DELETE")[0])
        FILE.unlink(missing_ok=True)




if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "status")
