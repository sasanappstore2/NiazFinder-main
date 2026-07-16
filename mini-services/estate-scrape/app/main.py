from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Header, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.config import MANIFEST_PATH, SCRAPEGRAPH_ROOT
from app.dataset_builder import build_dataset
from app.qwen_client import mlx_health_ok
from app.scraper import scrape_article
from app.filing_feed.scraper import preview_filing_feed, scrape_filing_feed
from app.filing_feed import scrapegraph_engine as filing_ai
from app.business_import.preview import run_business_import_preview

app = FastAPI(title="NiazFinder Estate Scrape", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ScrapeUrlRequest(BaseModel):
    url: str = Field(..., min_length=8)
    use_scrapegraph: bool = True


class BuildDatasetRequest(BaseModel):
    target: int = Field(default=10_000, ge=100)
    holdout: int = Field(default=200, ge=20)
    resume: bool = True
    use_scrapegraph: bool = True
    max_urls: int = Field(default=2500, ge=10)


class BusinessImportPreviewRequest(BaseModel):
    url: str = Field(..., min_length=8)
    hintBlueprintId: str | None = None
    occupationSlugs: list[str] = Field(default_factory=list)


class FilingFeedScrapeRequest(BaseModel):
    siteKey: str = Field(..., min_length=2)
    loginUrl: str = ""
    listingsUrl: str = Field(..., min_length=8)
    username: str = ""
    password: str = ""
    siteConfig: dict = Field(default_factory=dict)
    maxItems: int | None = Field(default=None, ge=1, le=5000)
    withinDays: int | None = Field(default=None, ge=1, le=120)
    knownExternalIds: list[str] = Field(default_factory=list)


class FilingAiOnboardRequest(BaseModel):
    siteKey: str = Field(default="portal", min_length=2)
    loginUrl: str = Field(..., min_length=8)
    listingsUrl: str = ""
    username: str = ""
    password: str = ""
    userCity: str = ""
    siteConfig: dict = Field(default_factory=dict)
    asyncJob: bool = True


class FilingSiteMapRequest(BaseModel):
    entryUrl: str = Field(..., min_length=8)
    userCity: str = ""
    maxVisits: int = Field(default=18, ge=3, le=40)
    asyncJob: bool = True


class FilingAiScrapeRequest(BaseModel):
    siteKey: str = Field(..., min_length=2)
    loginUrl: str = Field(..., min_length=8)
    listingsUrl: str = Field(..., min_length=8)
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)
    siteConfig: dict = Field(default_factory=dict)
    maxItems: int | None = Field(default=5, ge=1, le=50)
    userCity: str = ""


class FilingDiscoverHtmlRequest(BaseModel):
    html: str = Field(..., min_length=20)
    baseUrl: str = Field(default="https://example.com/", min_length=8)
    userCity: str = ""


class FilingEnrichDetailRequest(BaseModel):
    siteKey: str = Field(..., min_length=2)
    listing: dict = Field(default_factory=dict)
    siteConfig: dict = Field(default_factory=dict)
    loginUrl: str = ""
    username: str = ""
    password: str = ""


def _require_estate_scrape_secret(x_estate_scrape_secret: str | None) -> None:
    expected = os.environ.get("ESTATE_SCRAPE_SECRET", "").strip()
    if not expected:
        return
    if not x_estate_scrape_secret or x_estate_scrape_secret.strip() != expected:
        raise HTTPException(status_code=401, detail="unauthorized")


@app.get("/health")
def health():
    return {
        "ok": True,
        "mlxOk": mlx_health_ok(),
        "scrapegraphPath": str(SCRAPEGRAPH_ROOT),
        "engine": "scrapegraph",
    }


_LEGACY_SESSION_DETAIL = (
    "Live browser session API removed. Use POST /v1/filing-feed/ai-onboard. "
    "Hard-refresh the filing wizard and restart npm run dev:estate-scrape."
)


@app.api_route(
    "/v1/filing-feed/session/{_path:path}",
    methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
)
def legacy_filing_session(_path: str):
    raise HTTPException(status_code=410, detail=_LEGACY_SESSION_DETAIL)


@app.post("/v1/scrape-url")
def v1_scrape_url(body: ScrapeUrlRequest):
    if not mlx_health_ok():
        raise HTTPException(status_code=503, detail="intake-mlx (Qwen) not running")
    data = scrape_article(body.url, use_scrapegraph=body.use_scrapegraph)
    if not data:
        raise HTTPException(status_code=422, detail="scrape or extract failed")
    return data


@app.post("/v1/filing-feed/scrape")
async def v1_filing_feed_scrape(
    body: FilingFeedScrapeRequest,
    x_estate_scrape_secret: str | None = Header(default=None),
):
    _require_estate_scrape_secret(x_estate_scrape_secret)
    result = await run_in_threadpool(scrape_filing_feed, body.model_dump())
    if not result.get("ok"):
        raise HTTPException(status_code=422, detail=result.get("error") or "scrape failed")
    return result


@app.post("/v1/filing-feed/preview")
async def v1_filing_feed_preview(
    body: FilingFeedScrapeRequest,
    x_estate_scrape_secret: str | None = Header(default=None),
):
    _require_estate_scrape_secret(x_estate_scrape_secret)
    result = await run_in_threadpool(preview_filing_feed, body.model_dump())
    if not result.get("ok"):
        raise HTTPException(status_code=422, detail=result.get("error") or "preview failed")
    return result


@app.post("/v1/filing-feed/enrich-detail")
async def v1_filing_enrich_detail(
    body: FilingEnrichDetailRequest,
    x_estate_scrape_secret: str | None = Header(default=None),
):
    _require_estate_scrape_secret(x_estate_scrape_secret)
    from app.filing_feed.filing_auth import storage_state_for_site
    from app.filing_feed.listing_detail_extractor import enrich_listing_from_detail
    from app.filing_feed.scraper import _ensure_auth, _has_credentials

    site_config = dict(body.siteConfig or {})
    state = storage_state_for_site(body.siteKey, site_config)
    login_url = str(body.loginUrl or "").strip()
    username = str(body.username or "").strip()
    password = str(body.password or "").strip()
    if not state and _has_credentials(username, password) and login_url:
        state = _ensure_auth(
            login_url=login_url,
            username=username,
            password=password,
            site_key=body.siteKey,
            site_config=site_config,
        )
    try:
        enriched = await run_in_threadpool(
            enrich_listing_from_detail,
            dict(body.listing or {}),
            storage_state=str(state) if state else None,
            site_config=site_config,
        )
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
    return {"ok": True, "listing": enriched}


@app.post("/v1/filing-feed/ai-onboard")
async def v1_filing_ai_onboard(
    body: FilingAiOnboardRequest,
    x_estate_scrape_secret: str | None = Header(default=None),
):
    _require_estate_scrape_secret(x_estate_scrape_secret)
    payload = body.model_dump()
    if body.asyncJob:
        job_id = filing_ai.start_onboard_job(payload)
        return {"ok": True, "jobId": job_id, "status": "running"}
    try:
        result = await run_in_threadpool(filing_ai.ai_onboard_full, payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    if not result.get("ok"):
        raise HTTPException(status_code=422, detail=result.get("error") or "onboard failed")
    return result


@app.get("/v1/filing-feed/ai-onboard/{job_id}/status")
async def v1_filing_ai_onboard_status(
    job_id: str,
    x_estate_scrape_secret: str | None = Header(default=None),
):
    _require_estate_scrape_secret(x_estate_scrape_secret)
    payload = filing_ai.job_status_payload(job_id)
    if not payload.get("ok"):
        raise HTTPException(status_code=404, detail="job not found")
    return payload


@app.post("/v1/filing-feed/site-map")
async def v1_filing_site_map(
    body: FilingSiteMapRequest,
    x_estate_scrape_secret: str | None = Header(default=None),
):
    _require_estate_scrape_secret(x_estate_scrape_secret)
    payload = body.model_dump()
    if body.asyncJob:
        job_id = filing_ai.start_site_map_job(payload)
        return {"ok": True, "jobId": job_id, "status": "running"}
    from app.filing_feed.site_mapper import map_site_public

    try:
        result = await run_in_threadpool(
            map_site_public,
            entry_url=body.entryUrl,
            user_city=body.userCity,
            max_visits=body.maxVisits,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    if not result.get("ok"):
        raise HTTPException(status_code=422, detail=result.get("error") or "site map failed")
    return {**result, "mode": "public_map"}


@app.get("/v1/filing-feed/site-map/{job_id}/status")
async def v1_filing_site_map_status(
    job_id: str,
    x_estate_scrape_secret: str | None = Header(default=None),
):
    _require_estate_scrape_secret(x_estate_scrape_secret)
    payload = filing_ai.job_status_payload(job_id)
    if not payload.get("ok"):
        raise HTTPException(status_code=404, detail="job not found")
    return payload


@app.post("/v1/filing-feed/ai-scrape")
async def v1_filing_ai_scrape(
    body: FilingAiScrapeRequest,
    x_estate_scrape_secret: str | None = Header(default=None),
):
    _require_estate_scrape_secret(x_estate_scrape_secret)
    from app.filing_feed.filing_auth import login_and_save_state, storage_state_for_site

    payload = body.model_dump()
    site_key = body.siteKey
    site_config = dict(body.siteConfig or {})

    try:
        storage_state = storage_state_for_site(site_key, site_config)
        if not storage_state:
            login = await run_in_threadpool(
                login_and_save_state,
                login_url=body.loginUrl.strip(),
                username=body.username,
                password=body.password,
                site_key=site_key,
                site_config=site_config,
            )
            if not login.get("ok"):
                raise HTTPException(status_code=422, detail=login.get("error") or "login failed")
            storage_state = str(login["storageStatePath"])

        result = await run_in_threadpool(
            filing_ai.ai_scrape_listings,
            listings_url=body.listingsUrl.strip(),
            storage_state=storage_state,
            site_key=site_key,
            site_config=site_config,
            user_city=body.userCity,
            max_items=body.maxItems,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

    if not result.get("ok"):
        raise HTTPException(status_code=422, detail=result.get("error") or "scrape failed")
    return result


@app.post("/v1/filing-feed/discover-html")
async def v1_filing_discover_html(
    body: FilingDiscoverHtmlRequest,
    x_estate_scrape_secret: str | None = Header(default=None),
):
    _require_estate_scrape_secret(x_estate_scrape_secret)
    from app.filing_feed.site_indexer import discover_from_html

    try:
        return await run_in_threadpool(
            discover_from_html,
            body.html,
            body.baseUrl.strip(),
            body.userCity.strip(),
        )
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e)) from e


@app.post("/v1/business-import/preview")
def v1_business_import_preview(
    body: BusinessImportPreviewRequest,
    x_estate_scrape_secret: str | None = Header(default=None),
):
    _require_estate_scrape_secret(x_estate_scrape_secret)
    if not mlx_health_ok():
        raise HTTPException(status_code=503, detail="intake-mlx (Qwen) not running")
    try:
        return run_business_import_preview(
            body.url.strip(),
            hint_blueprint_id=body.hintBlueprintId,
            occupation_slugs=body.occupationSlugs,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/v1/build-dataset")
def v1_build_dataset(body: BuildDatasetRequest):
    if not mlx_health_ok():
        raise HTTPException(status_code=503, detail="intake-mlx (Qwen) not running")
    try:
        manifest = build_dataset(
            target=body.target,
            holdout=body.holdout,
            resume=body.resume,
            use_scrapegraph=body.use_scrapegraph,
            max_urls=body.max_urls,
        )
        return manifest
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.get("/v1/manifest")
def v1_manifest():
    if not MANIFEST_PATH.exists():
        return {"ok": False, "message": "manifest not found"}
    import json

    return json.loads(MANIFEST_PATH.read_text("utf8"))


def run():
    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=8200, reload=False)


if __name__ == "__main__":
    run()
