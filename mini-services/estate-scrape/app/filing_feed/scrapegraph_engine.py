"""ScrapeGraph-powered filing portal onboard + scrape engine."""

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from typing import Any

from app.filing_feed.authenticated_discover import authenticated_discover
from app.filing_feed.dom_onboard_preview import dom_onboard_preview
from app.filing_feed.filing_auth import (
    fetch_authenticated_html,
    guess_listings_url,
    login_and_save_state,
    storage_state_for_site,
)
from app.filing_feed.schemas import (
    FilingListingsPage,
    PortalDiscoveryResult,
    listing_to_dict,
)
from app.filing_feed.site_indexer import discover_from_html
from app.filing_feed.site_mapper import map_site_public
from app.scrapegraph_bridge import (
    filing_graph_config,
    persian_discovery_prompt,
    persian_link_search_prompt,
    persian_listing_prompt,
    run_graph_sync,
)


@dataclass
class OnboardJob:
    job_id: str
    status: str = "pending"
    step: str = "queued"
    progress: float = 0.0
    result: dict[str, Any] | None = None
    error: str | None = None
    telemetry: list[dict[str, Any]] = field(default_factory=list)
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)

    def touch(self, *, step: str | None = None, progress: float | None = None) -> None:
        self.updated_at = time.time()
        if step is not None:
            self.step = step
        if progress is not None:
            self.progress = progress

    def log(self, event: str, **meta: Any) -> None:
        self.telemetry.append({"t": time.time(), "event": event, **meta})
        self.updated_at = time.time()


_jobs: dict[str, OnboardJob] = {}


def get_job(job_id: str) -> OnboardJob | None:
    return _jobs.get(job_id)


def _merge_discovery(
    sg_result: dict[str, Any] | None,
    html_discovery: dict[str, Any],
    listings_url: str,
) -> dict[str, Any]:
    blueprint = dict(html_discovery.get("blueprint") or {})
    site_index = html_discovery.get("siteIndex") or {}
    sg = sg_result or {}

    if sg.get("listingsUrl"):
        listings_url = str(sg["listingsUrl"])
    if sg.get("containerSelector"):
        blueprint.setdefault("listPage", {})
        blueprint["listPage"]["containerSelector"] = sg["containerSelector"]
    if sg.get("itemLinkSelector"):
        blueprint.setdefault("listPage", {})
        blueprint["listPage"]["itemLinkSelector"] = sg["itemLinkSelector"]

    return {
        "ok": True,
        "listingsUrl": listings_url,
        "blueprint": blueprint,
        "siteIndex": site_index,
        "fieldGuesses": html_discovery.get("fieldGuesses") or [],
        "sampleCards": html_discovery.get("sampleCards") or sg.get("sampleTitles") or [],
        "confidenceMap": html_discovery.get("confidenceMap") or {},
        "discovery": sg,
    }


def ai_discover_portal(
    *,
    login_url: str,
    listings_url: str | None,
    storage_state: str,
    user_city: str = "",
) -> dict[str, Any]:
    """Find listings page URL and blueprint hints."""
    html = fetch_authenticated_html(login_url, storage_state=storage_state)
    resolved_listings = listings_url or guess_listings_url(html, login_url) or login_url

    if resolved_listings != login_url:
        try:
            html = fetch_authenticated_html(resolved_listings, storage_state=storage_state)
        except Exception:
            pass

    html_discovery = discover_from_html(html, resolved_listings, user_city)

    sg_result: dict[str, Any] | None = None
    try:
        from scrapegraphai.graphs import SmartScraperGraph

        cfg = filing_graph_config(storage_state=storage_state, reattempt=True)
        raw = run_graph_sync(
            SmartScraperGraph,
            prompt=persian_discovery_prompt(),
            source=resolved_listings,
            config=cfg,
            schema=PortalDiscoveryResult,
        )
        if isinstance(raw, dict):
            sg_result = raw
            if sg_result.get("listingsUrl"):
                resolved_listings = str(sg_result["listingsUrl"])
    except Exception:
        sg_result = None

    return _merge_discovery(sg_result, html_discovery, resolved_listings)


def ai_extract_blueprint(
    *,
    listings_url: str,
    storage_state: str,
    user_city: str = "",
) -> dict[str, Any]:
    return ai_discover_portal(
        login_url=listings_url,
        listings_url=listings_url,
        storage_state=storage_state,
        user_city=user_city,
    )


def ai_scrape_listings(
    *,
    listings_url: str,
    storage_state: str | None,
    site_key: str,
    site_config: dict[str, Any],
    user_city: str = "",
    max_items: int | None = None,
    custom_prompt: str = "",
) -> dict[str, Any]:
    state = storage_state or storage_state_for_site(site_key, site_config)
    prompt = custom_prompt.strip() or persian_listing_prompt(user_city=user_city)
    cfg = filing_graph_config(storage_state=state, reattempt=True)

    listings: list[dict[str, Any]] = []
    extract_method = "scrapegraph"
    page_url = listings_url

    try:
        from scrapegraphai.graphs import SmartScraperGraph

        raw = run_graph_sync(
            SmartScraperGraph,
            prompt=prompt,
            source=listings_url,
            config=cfg,
            schema=FilingListingsPage,
        )
        rows = []
        if isinstance(raw, dict):
            rows = raw.get("listings") or []
            if raw.get("nextPageUrl"):
                page_url = str(raw["nextPageUrl"])
        for idx, row in enumerate(rows):
            norm = listing_to_dict(row, idx)
            if norm:
                listings.append(norm)
    except Exception as exc:
        return {
            "ok": False,
            "listings": [],
            "pageUrl": page_url,
            "extractMethod": "scrapegraph",
            "error": str(exc),
        }

    if not listings:
        try:
            html = fetch_authenticated_html(listings_url, storage_state=state)
            from app.filing_feed.scraper import _llm_extract

            listings, extract_method = _llm_extract(listings_url, html, site_key, site_config)
            page_url = listings_url
        except Exception as exc:
            return {
                "ok": False,
                "listings": [],
                "pageUrl": page_url,
                "extractMethod": "scrapegraph+fallback",
                "error": str(exc),
            }

    if max_items is not None:
        listings = listings[:max_items]

    return {
        "ok": bool(listings),
        "listings": listings,
        "pageUrl": page_url,
        "extractMethod": extract_method,
        "error": None if listings else "no listings parsed",
    }


    return _merge_discovery(sg_result, html_discovery, resolved_listings)


def _finalize_onboard_payload(
    *,
    mode: str,
    login_url: str,
    listings_url: str,
    blueprint: dict[str, Any],
    site_index: dict[str, Any] | None,
    field_guesses: list[dict[str, Any]],
    sample_cards: list[str],
    confidence_map: dict[str, Any],
    preview: dict[str, Any],
    storage_state_path: str | None = None,
    list_pages: list[dict[str, Any]] | None = None,
    navigation_tree: list[dict[str, Any]] | None = None,
    field_visibility: dict[str, Any] | None = None,
    login_required: bool = False,
    pages_visited: int = 0,
    notes: str | None = None,
) -> dict[str, Any]:
    bp = dict(blueprint)
    bp.setdefault("detailPage", {"enabled": True, "linkFromList": True, "maxConcurrent": 3})
    if storage_state_path:
        bp.setdefault("auth", {})
        bp["auth"]["storageStatePath"] = storage_state_path

    telemetry = [
        {"event": "discover", "listingsUrl": listings_url, "mode": mode},
        {
            "event": "preview",
            "count": len(preview.get("listings") or []),
            "extractMethod": preview.get("extractMethod"),
            "paginationValidated": preview.get("paginationValidated"),
        },
    ]
    if mode == "public_map":
        telemetry.insert(0, {"event": "site_map", "pagesVisited": pages_visited})
    else:
        telemetry.insert(0, {"event": "login", "ok": True, "pageUrl": login_url})

    return {
        "ok": True,
        "mode": mode,
        "loginUrl": login_url,
        "listingsUrl": listings_url,
        "blueprint": bp,
        "siteIndex": site_index,
        "fieldGuesses": field_guesses,
        "sampleCards": sample_cards,
        "confidenceMap": confidence_map,
        "previewListings": preview.get("listings") or [],
        "storageStatePath": storage_state_path,
        "siteConfig": bp,
        "listPages": list_pages or [],
        "navigationTree": navigation_tree or [],
        "fieldVisibility": field_visibility,
        "loginRequired": login_required,
        "pagesVisited": pages_visited,
        "notes": notes,
        "paginationValidated": preview.get("paginationValidated"),
        "telemetry": telemetry,
    }


def ai_onboard_full(payload: dict[str, Any]) -> dict[str, Any]:
    site_key = str(payload.get("siteKey") or "site")
    login_url = str(payload.get("loginUrl") or payload.get("entryUrl") or "").strip()
    listings_url = str(payload.get("listingsUrl") or "").strip() or None
    username = str(payload.get("username") or "").strip()
    password = str(payload.get("password") or "").strip()
    user_city = str(payload.get("userCity") or payload.get("defaultCity") or "").strip()
    site_config = dict(payload.get("siteConfig") or {})

    if not login_url:
        return {"ok": False, "error": "missing entry URL"}

    if not username or not password:
        mapped = map_site_public(entry_url=login_url, user_city=user_city)
        if not mapped.get("ok"):
            return mapped

        resolved_login = str(mapped.get("loginUrl") or login_url)
        resolved_listings = str(mapped.get("listingsUrl") or login_url)
        blueprint = dict(mapped.get("blueprint") or {})
        preview = dom_onboard_preview(
            resolved_listings,
            blueprint,
            site_key=site_key,
            user_city=user_city,
            max_items=5,
            max_pages=2,
        )
        if not preview.get("listings"):
            llm_preview = ai_scrape_listings(
                listings_url=resolved_listings,
                storage_state=None,
                site_key=site_key,
                site_config=blueprint,
                user_city=user_city,
                max_items=5,
            )
            if llm_preview.get("listings"):
                preview = {
                    **preview,
                    "ok": True,
                    "listings": llm_preview.get("listings") or [],
                    "extractMethod": llm_preview.get("extractMethod"),
                }

        return _finalize_onboard_payload(
            mode="public_map",
            login_url=resolved_login,
            listings_url=resolved_listings,
            blueprint=blueprint,
            site_index=mapped.get("siteIndex"),
            field_guesses=mapped.get("fieldGuesses") or [],
            sample_cards=mapped.get("sampleCards") or [],
            confidence_map=mapped.get("confidenceMap") or {},
            preview=preview,
            list_pages=mapped.get("listPages") or [],
            navigation_tree=mapped.get("navigationTree") or [],
            field_visibility=mapped.get("fieldVisibility"),
            login_required=bool(mapped.get("loginRequired")),
            pages_visited=int(mapped.get("pagesVisited") or 0),
            notes=str(mapped.get("notes") or ""),
        )

    discovery = authenticated_discover(
        login_url=login_url,
        listings_url=listings_url,
        username=username,
        password=password,
        site_key=site_key,
        site_config=site_config,
        user_city=user_city,
    )
    if not discovery.get("ok"):
        return {"ok": False, "error": discovery.get("error") or "authenticated discover failed"}

    resolved_listings = str(discovery.get("listingsUrl") or listings_url or login_url)
    blueprint = dict(discovery.get("blueprint") or {})
    storage_state = str(discovery.get("storageStatePath") or "")

    preview = dom_onboard_preview(
        resolved_listings,
        blueprint,
        site_key=site_key,
        storage_state=storage_state or None,
        user_city=user_city,
        max_items=5,
        max_pages=2,
    )
    if not preview.get("listings"):
        llm_preview = ai_scrape_listings(
            listings_url=resolved_listings,
            storage_state=storage_state or None,
            site_key=site_key,
            site_config={**site_config, "auth": blueprint.get("auth", {})},
            user_city=user_city,
            max_items=5,
        )
        if llm_preview.get("listings"):
            preview = {
                **preview,
                "ok": True,
                "listings": llm_preview.get("listings") or [],
                "extractMethod": llm_preview.get("extractMethod"),
            }

    portal_map = blueprint.get("portalMap") or {}
    list_pages = portal_map.get("listPages") or [
        {"url": resolved_listings, "containerSelector": (blueprint.get("listPage") or {}).get("containerSelector")}
    ]

    return _finalize_onboard_payload(
        mode="authenticated",
        login_url=login_url,
        listings_url=resolved_listings,
        blueprint=blueprint,
        site_index=discovery.get("siteIndex"),
        field_guesses=discovery.get("fieldGuesses") or [],
        sample_cards=discovery.get("sampleCards") or [],
        confidence_map=discovery.get("confidenceMap") or {},
        preview=preview,
        storage_state_path=storage_state or None,
        list_pages=list_pages,
        login_required=False,
        pages_visited=0,
        notes="کشف با ورود و BFS داخلی انجام شد.",
    )


def start_onboard_job(payload: dict[str, Any]) -> str:
    job_id = str(uuid.uuid4())
    has_creds = bool(str(payload.get("username") or "").strip() and str(payload.get("password") or "").strip())
    job = OnboardJob(
        job_id=job_id,
        status="running",
        step="login" if has_creds else "crawl",
        progress=0.1,
    )
    _jobs[job_id] = job

    def _run() -> None:
        try:
            if has_creds:
                job.log("login_start")
                job.touch(step="login", progress=0.15)
            else:
                job.log("site_map_start")
                job.touch(step="crawl", progress=0.2)
            result = ai_onboard_full(payload)
            if not result.get("ok"):
                job.status = "failed"
                job.error = str(result.get("error") or "onboard failed")
                job.touch(step="failed", progress=1.0)
                return
            job.result = result
            job.status = "completed"
            job.touch(step="done", progress=1.0)
            job.log("completed", listingsUrl=result.get("listingsUrl"))
        except Exception as exc:
            job.status = "failed"
            job.error = str(exc)
            job.touch(step="failed", progress=1.0)

    import threading

    threading.Thread(target=_run, daemon=True).start()
    return job_id


def start_site_map_job(payload: dict[str, Any]) -> str:
    job_id = str(uuid.uuid4())
    job = OnboardJob(job_id=job_id, status="running", step="crawl", progress=0.1)
    _jobs[job_id] = job

    def _run() -> None:
        try:
            job.log("site_map_start")
            job.touch(step="crawl", progress=0.25)
            entry = str(payload.get("entryUrl") or payload.get("loginUrl") or "").strip()
            user_city = str(payload.get("userCity") or "").strip()
            max_visits = int(payload.get("maxVisits") or 18)
            result = map_site_public(entry_url=entry, user_city=user_city, max_visits=max_visits)
            if not result.get("ok"):
                job.status = "failed"
                job.error = str(result.get("error") or "site map failed")
                job.touch(step="failed", progress=1.0)
                return
            job.result = {**result, "mode": "public_map"}
            job.status = "completed"
            job.touch(step="done", progress=1.0)
            job.log("completed", pagesVisited=result.get("pagesVisited"))
        except Exception as exc:
            job.status = "failed"
            job.error = str(exc)
            job.touch(step="failed", progress=1.0)

    import threading

    threading.Thread(target=_run, daemon=True).start()
    return job_id


def job_status_payload(job_id: str) -> dict[str, Any]:
    job = _jobs.get(job_id)
    if not job:
        return {"ok": False, "error": "job not found"}
    out: dict[str, Any] = {
        "ok": True,
        "jobId": job.job_id,
        "status": job.status,
        "step": job.step,
        "progress": job.progress,
        "telemetry": job.telemetry,
        "error": job.error,
    }
    if job.result:
        out["result"] = job.result
    return out
