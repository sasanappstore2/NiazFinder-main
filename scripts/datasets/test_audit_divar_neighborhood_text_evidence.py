#!/usr/bin/env python3
"""Unit tests for the aggregate-only Divar neighborhood text evidence audit."""

from __future__ import annotations

import importlib.util
from pathlib import Path


SCRIPT = Path(__file__).with_name("audit-divar-neighborhood-text-evidence.py")
SPEC = importlib.util.spec_from_file_location("divar_neighborhood_text_evidence", SCRIPT)
assert SPEC and SPEC.loader
AUDIT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(AUDIT)


def row(text: str, *, city: str = "tehran", neighborhood_id: str = "ونک",
        neighborhood_name: str = "ونک", group: str = "group-1", split: str = "train",
        match_kind: str = "exact_official_crosswalk") -> dict:
    return {
        "exampleId": group,
        "split": split,
        "state": text,
        "source": {"normalizedTextGroupSha256": group},
        "typedDecisions": {"offer_category": {"value": "apartment-sale"}},
        "offerLocation": {
            "neighborhoodMatch": match_kind,
            "appCitySlug": city,
            "appNeighborhoodId": neighborhood_id,
            "appNeighborhoodName": neighborhood_name,
        },
    }


def main() -> None:
    assert AUDIT.neighborhood_pattern("ونک").search("آپارتمان در ونک، تهران")
    assert AUDIT.neighborhood_pattern("فرامرزعباسی").search("محدودهٔ فرامرز عباسی")
    assert AUDIT.neighborhood_pattern("فردوسى").search("فردوسی ۱۲۰ متری")
    assert not AUDIT.neighborhood_pattern("ونک").search("ونکی")
    assert AUDIT.neighborhood_pattern("فردوسی").search("محدوده‌ فردوسی")
    assert AUDIT.neighborhood_pattern("ری") is None

    rows = iter([
        row("یه آپارتمان حوالی ونک می‌خوام", group="same", split="train"),
        row("یه آپارتمان حوالی ونک میخوام", group="same", split="train"),
        row("آپارتمان ۱۲۰ متری در ونکی", group="not-an-exact-mention"),
        row("خانه در ونک", city="mashhad", group="different-city"),
        row("خانه در ونک", group="legacy-name", match_kind="legacy_suffix_alias"),
        row("خانه در ونک و شهرک غرب و ولنجک", neighborhood_id="ونک", neighborhood_name="ونک", group="conflict-set"),
        row("خانه در ونک و شهرک غرب و ولنجک", neighborhood_id="شهرک غرب", neighborhood_name="شهرک غرب", group="conflict-set", split="test"),
        row("خانه در ونک و شهرک غرب و ولنجک", neighborhood_id="ولنجک", neighborhood_name="ولنجک", group="conflict-set", split="test"),
        row("آپارتمان در ونک", group="split-group", split="train"),
        row("آپارتمان در ونک", group="split-group", split="test"),
        {
            "state": "خانه در ونک",
            "offerLocation": {"neighborhoodMatch": "unresolved_or_not_stated"},
        },
    ])
    report = AUDIT.audit_rows(rows, "fixture-sha")
    assert report["mappedRows"] == 10
    assert report["mappedRowsByMatchKind"] == {
        "exact_official_crosswalk": 9,
        "legacy_suffix_alias": 1,
    }
    assert report["rowsWithExactGeoLabelMention"] == 8
    assert report["legacyAliasMappedRows"] == 1
    assert report["rowsWithLegacyAliasLabelMention"] == 1
    assert report["rowsWithCatalogLabelMention"] == 9
    assert report["uniqueMentionedTextGroups"] == 5
    assert report["conflictingMentionedTextGroups"] == 1
    assert report["crossSplitMentionedTextGroups"] == 2
    assert report["mentionEvidenceByMatchKind"]["exact_official_crosswalk"]["uniqueMentionedTextGroups"] == 4
    assert report["mentionEvidenceByMatchKind"]["legacy_suffix_alias"]["uniqueMentionedTextGroups"] == 1
    assert report["sourcePerspective"] == "seller_or_agent_supply_offer"
    assert report["isSeekerNeedGroundTruth"] is False
    assert report["trainingEligible"] is False
    assert report["inputSha256"] == "fixture-sha"
    assert report["rowsWithExactGeoLabelMentionByCategory"] == {"apartment-sale": 8}
    print("Divar neighborhood mention audit: Persian normalization, boundaries, city-safe provenance and de-dup tests passed")


if __name__ == "__main__":
    main()
