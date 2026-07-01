"""Prepare live HTML mirror for wizard (optional static preview)."""

from __future__ import annotations

from typing import Any

from bs4 import BeautifulSoup

MIRROR_STYLE = """
.nf-mirror-hover {
  outline: 2px dashed #0ea5e9 !important;
  outline-offset: 1px;
  background: rgba(14, 165, 233, 0.08) !important;
}
"""


def prepare_html_mirror(raw_html: str, base_url: str) -> str:
    soup = BeautifulSoup(raw_html, "html.parser")
    if not soup.html:
        wrapper = BeautifulSoup("<html><head></head><body></body></html>", "html.parser")
        wrapper.body.append(soup)
        soup = wrapper

    head = soup.head
    if head is None:
        head = soup.new_tag("head")
        if soup.html:
            soup.html.insert(0, head)

    for tag in soup.find_all(["script", "iframe", "object", "embed"]):
        tag.decompose()

    for tag in soup.find_all("meta"):
        if (tag.get("http-equiv") or "").lower() == "refresh":
            tag.decompose()

    if head.select_one("base"):
        head.select_one("base")["href"] = base_url
    else:
        head.insert(0, soup.new_tag("base", href=base_url))

    if not head.select_one("style[data-nf-mirror]"):
        style = soup.new_tag("style", attrs={"data-nf-mirror": "1"})
        style.string = MIRROR_STYLE
        head.append(style)

    out = str(soup)
    if not out.strip().lower().startswith("<!doctype"):
        out = "<!DOCTYPE html>\n" + out
    return out


def mirror_payload(raw_html: str, base_url: str, *, title: str = "") -> dict[str, Any]:
    return {
        "html": prepare_html_mirror(raw_html, base_url),
        "url": base_url,
        "title": title,
    }
