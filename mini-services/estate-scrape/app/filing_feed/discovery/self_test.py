"""Self-test discovery engine on bundled fixtures."""

from __future__ import annotations

import json

from app.filing_feed.fixture_paths import filing_portals_dir

from app.filing_feed.site_indexer import discover_from_html

FIXTURES = filing_portals_dir()


def run() -> None:
    for site in ("showmelk", "maskanyaban"):
        list_html = (FIXTURES / site / "list-sample.html").read_text(encoding="utf-8")
        if site == "maskanyaban":
            blueprint = json.loads((FIXTURES / site / "blueprint.json").read_text(encoding="utf-8"))
            container = blueprint.get("listPage", {}).get("containerSelector")
            assert container, blueprint
            assert len(blueprint.get("fieldMap") or {}) >= 3
            print(f"[OK] {site} list", container)
        else:
            r = discover_from_html(list_html, f"https://{site}.test/", "مشهد")
            assert r["ok"], r
            bp = r["blueprint"]
            assert bp["listPage"]["containerSelector"]
            assert len(bp["fieldMap"]) >= 3, bp["fieldMap"]
            print(f"[OK] {site} list", bp["listPage"]["containerSelector"])

        login_html = (FIXTURES / site / "login.html").read_text(encoding="utf-8")
        lr = discover_from_html(login_html, f"https://{site}.test/")
        assert lr["siteIndex"]["loginForm"], lr
        print(f"[OK] {site} login", lr["siteIndex"]["loginForm"]["usernameSelector"])

    print("ALL DISCOVERY SELF-TESTS PASSED")


if __name__ == "__main__":
    run()
