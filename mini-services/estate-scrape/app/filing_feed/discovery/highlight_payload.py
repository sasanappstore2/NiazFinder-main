"""Build highlight region items from discovery output (offline wizard map)."""

from __future__ import annotations

from typing import Any


def build_highlight_items(
    site_index: dict[str, Any],
    blueprint: dict[str, Any],
) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    auth = blueprint.get("auth") or site_index.get("loginForm") or {}
    if auth.get("usernameSelector"):
        items.append(
            {
                "id": "login-username",
                "mode": "selector",
                "selector": auth.get("usernameSelector"),
            }
        )
    if auth.get("passwordSelector"):
        items.append(
            {
                "id": "login-password",
                "mode": "selector",
                "selector": auth.get("passwordSelector"),
            }
        )

    list_page = blueprint.get("listPage") or {}
    container = list_page.get("containerSelector")
    if container:
        items.append(
            {
                "id": "list-container",
                "mode": "selector",
                "selector": container,
            }
        )
    item_link = list_page.get("itemLinkSelector")
    if item_link:
        items.append(
            {
                "id": "list-item-link",
                "mode": "selector",
                "selector": item_link,
            }
        )

    pagination = list_page.get("pagination") or site_index.get("pagination") or {}
    if pagination.get("selector"):
        items.append(
            {
                "id": "pagination-next",
                "mode": "selector",
                "selector": pagination.get("selector"),
            }
        )

    field_map = blueprint.get("fieldMap") or {}
    for key, spec in field_map.items():
        sel = (spec or {}).get("selector")
        if sel:
            items.append(
                {
                    "id": f"field-{key}",
                    "mode": "selector",
                    "selector": sel,
                    "containerSelector": container,
                }
            )

    return items
