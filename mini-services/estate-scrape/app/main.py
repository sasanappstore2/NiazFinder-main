from __future__ import annotations

import os
from pathlib import Path
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.config import MANIFEST_PATH, SCRAPEGRAPH_ROOT
from app.dataset_builder import build_dataset
from app.qwen_client import mlx_health_ok
from app.scraper import scrape_article
from app.business_import.preview import run_business_import_preview

app = FastAPI(title="NiazFinder Estate Scrape", version="0.1.0")

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
    }


@app.post("/v1/scrape-url")
def v1_scrape_url(body: ScrapeUrlRequest):
    if not mlx_health_ok():
        raise HTTPException(status_code=503, detail="intake-mlx (Qwen) not running")
    data = scrape_article(body.url, use_scrapegraph=body.use_scrapegraph)
    if not data:
        raise HTTPException(status_code=422, detail="scrape or extract failed")
    return data


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
