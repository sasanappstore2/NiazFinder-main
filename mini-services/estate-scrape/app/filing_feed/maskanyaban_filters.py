"""MaskanYaban list filter matrix (NoeMelk × NoeVagozari) for diverse crawls."""

from __future__ import annotations

from dataclasses import dataclass

BASE_URL = "https://maskanyaban.ir"


ALL_KINDS_NOE_MELK = "4"


@dataclass(frozen=True)
class MaskanyabanListFilter:
    deal_type: str
    property_kind: str
    noe_vagozari: str
    noe_melk: str
    deal_slug: str
    kind_slug: str

    @property
    def referer(self) -> str:
        return f"{BASE_URL}/estate/{self.kind_slug}/{self.deal_slug}/"

    @property
    def cell_key(self) -> str:
        return f"{self.deal_type}:{self.property_kind}"


DEAL_SLUGS: dict[str, tuple[str, str]] = {
    "sell": ("0", "sale"),
    "rent_rahn_ejare": ("1", "rent"),
    "rent_rahn_full": ("2", "mortgage"),
}

KIND_SLUGS: dict[str, tuple[str, str]] = {
    "apartment": ("0", "apartment"),
    "office": ("1", "office"),
    "villa": ("2", "villa"),
    "shop": ("3", "shop"),
    "land": ("5", "zamin"),
}


def maskanyaban_filter_matrix() -> list[MaskanyabanListFilter]:
    out: list[MaskanyabanListFilter] = []
    for deal_type, (noe_vagozari, deal_slug) in DEAL_SLUGS.items():
        for property_kind, (noe_melk, kind_slug) in KIND_SLUGS.items():
            out.append(
                MaskanyabanListFilter(
                    deal_type=deal_type,
                    property_kind=property_kind,
                    noe_vagozari=noe_vagozari,
                    noe_melk=noe_melk,
                    deal_slug=deal_slug,
                    kind_slug=kind_slug,
                )
            )
    return out


def maskanyaban_deal_wide_filters() -> list[MaskanyabanListFilter]:
    """One browse URL per deal with all property kinds — e.g. /estate/all/mortgage/."""
    out: list[MaskanyabanListFilter] = []
    for deal_type, (noe_vagozari, deal_slug) in DEAL_SLUGS.items():
        out.append(
            MaskanyabanListFilter(
                deal_type=deal_type,
                property_kind="all",
                noe_vagozari=noe_vagozari,
                noe_melk=ALL_KINDS_NOE_MELK,
                deal_slug=deal_slug,
                kind_slug="all",
            )
        )
    return out


def maskanyaban_harvest_cells(*, per_kind: bool = True) -> list[MaskanyabanListFilter]:
    """Deal-wide passes first (bulk), then optional per-kind cells (field coverage)."""
    cells = maskanyaban_deal_wide_filters()
    if per_kind:
        cells.extend(maskanyaban_filter_matrix())
    return cells
