"""python -m unittest tools/test_demo_review.py: the demo sign-up key rules, offline (no requests)."""
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).parent))
import demo_review  # noqa: E402

KEY = "k" * 32


class DemoKey(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.key_file = Path(self.tmp.name) / "demo_signup_key.txt"
        patcher = mock.patch.object(demo_review, "KEY_FILE", self.key_file)
        patcher.start()
        self.addCleanup(patcher.stop)

    def env(self, **kw):
        clean = {k: v for k, v in os.environ.items() if k not in ("KISMET_DEMO_SIGNUP_KEY", "DEMO_SIGNUP_KEY")}
        return mock.patch.dict(os.environ, {**clean, **kw}, clear=True)

    def test_env_wins(self):
        self.key_file.write_text("f" * 30)
        with self.env(KISMET_DEMO_SIGNUP_KEY=KEY):
            self.assertEqual(demo_review.demo_key(), KEY)

    def test_file(self):
        self.key_file.write_text(f"  {KEY}\n")
        with self.env():
            self.assertEqual(demo_review.demo_key(), KEY)

    def test_missing_fails_clearly_without_the_key(self):
        with self.env(), self.assertRaises(SystemExit) as e:
            demo_review.demo_key()
        self.assertIn("No demo sign-up key", str(e.exception))

    def test_short_key_is_not_echoed(self):
        with self.env(DEMO_SIGNUP_KEY="abc123"), self.assertRaises(SystemExit) as e:
            demo_review.demo_key()
        self.assertNotIn("abc123", str(e.exception))

    def test_create_sends_the_header(self):
        sent = []
        with self.env(KISMET_DEMO_SIGNUP_KEY=KEY), mock.patch.object(demo_review, "load", return_value={}), \
                mock.patch.object(demo_review, "FILE", Path(self.tmp.name) / "acc.json"), \
                mock.patch.object(demo_review, "call", side_effect=lambda *a, **k: sent.append(k) or (201, {"token": "t", "privateLink": "l"})), \
                mock.patch("builtins.print"):
            demo_review.main("create")
        self.assertTrue(sent and all(k["headers"] == {"x-kismet-demo-key": KEY} for k in sent))

    def test_status_is_read_only(self):
        calls = []
        acc = {"reviewer": {"token": "t", "name": "Sam (demo)"}}

        def fake(path, token=None, method="GET", body=None, headers=None):
            calls.append((method, path))
            return 200, {"conversations": [], "blocks": []}

        with mock.patch.object(demo_review, "load", return_value=acc), mock.patch.object(demo_review, "call", side_effect=fake), \
                mock.patch.object(sys, "argv", ["demo_review.py", "status"]), mock.patch("builtins.print"):
            demo_review.main("status")
        self.assertEqual(calls, [("GET", "/api/me/inbox"), ("GET", "/api/me/blocks")])


if __name__ == "__main__":
    unittest.main()
