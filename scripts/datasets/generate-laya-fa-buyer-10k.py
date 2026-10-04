#!/usr/bin/env python3
"""Generate 10,000 Persian buyer-need rows for Laya typed-decision fine-tuning.

Each row is written in the exact schema consumed by the audited trainer in
train-divar-laya-head.py: `state` (one Persian need sentence) plus
`hypotheticalNeed.targetDecisions` carrying category_candidate, property_kind
and transaction_type with explicit provenance.

Labels are DETERMINISTIC: the text is generated FROM the label triple with
category-consistent Persian templates, so every sentence provably implies its
own decisions. City/neighborhood are sampled from the real on-disk catalog
(1,207 cities / 48,110 neighborhoods). No Laya prediction is used as a label.

Deterministic split (train/calibration/test) is assigned by hashing the
normalized state exactly the way the trainer computes it.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import random
import unicodedata
from collections import Counter
from pathlib import Path
from typing import Any, Iterator

ROOT = Path(__file__).resolve().parents[2]
CATALOG_DIR = ROOT / "src" / "data" / "neighborhoods" / "catalog"
OUT_DIR = ROOT / "data" / "laya-experiments"

MODEL_ID = "convaiinnovations/laya-multilingual"
MODEL_REVISION = "e4e9ddf21a7b1903b7acffd8814ad4307bf63a67"
DATA_TASK = "niazfinder-fa-buyer-laya-proposal/v1"
DATA_VERSION = 1
DATASET_TAG = "niazfinder-fa-buyer-synthetic/v1"
SOURCE_DATASET = "niazfinder-fa-buyer-persian-templates"
TARGET_TOTAL = 10_000

# ---------------------------------------------------------------- decisions
# Mirrors src/config/category-filters/options.ts (DEAL_TYPE_PROPERTY,
# PROPERTY_KIND) so the choice vocabulary of the fine-tune matches the
# question factory already used by /api/post/natural-analyze.

CATEGORY_PLAN: dict[str, tuple[str, str, int]] = {
    # slug -> (property_kind, transaction_type, rows)
    "apartment-rent":        ("apartment", "rent_rahn_ejare",   1500),
    "apartment-sale":        ("apartment", "buy",               1300),
    "villa-rent":            ("villa",     "rent_rahn_ejare",    750),
    "villa-sale":            ("villa",     "buy",                700),
    "land-sale":             ("land",      "buy",                600),
    "shop-rent":             ("shop",      "rent_rahn_ejare",    650),
    "shop-sale":             ("shop",      "buy",                600),
    "office-rent":           ("office",    "rent_monthly",       600),
    "office-sale":           ("office",    "buy",                450),
    "industrial-rent":       ("industrial","rent_monthly",       350),
    "industrial-sale":       ("industrial","buy",                350),
    "land-rent":             ("land",      "rent_monthly",       250),
    "suite-apartment-rent":  ("apartment", "rent_short_term",    500),
    "villa-short-rent":      ("villa",     "rent_short_term",    400),
    "workspace-short-rent":  ("office",    "rent_short_term",    400),
    "agency-services":       ("unknown",   "buy",                250),
    "construction-partnership": ("land",   "unknown",            180),
    "pre-sale-services":     ("apartment", "buy",                170),
}
assert sum(v[2] for v in CATEGORY_PLAN.values()) == TARGET_TOTAL


# colloquialness scales used to keep the corpus out of one register only
REGISTER_FORMAL = "formal"
REGISTER_SPOKEN = "spoken"
REGISTERS = (REGISTER_FORMAL, REGISTER_SPOKEN, REGISTER_SPOKEN)

CITY_WEIGHT_KEYS = {
    "تهران", "مشهد", "اصفهان", "شیراز", "کرج", "تبریز", "اهواز", "قم",
    "کرمان", "رشت", "یزد", "اردبیل", "زنجان", "بیرجند", "بندرعباس",
}


def normalize_model_input(text: str) -> str:
    """Byte-identical to train-divar-laya-head.py:normalise state hashing."""
    value = unicodedata.normalize("NFKC", text)
    value = value.translate(str.maketrans({
        "ي": "ی", "ى": "ی", "ك": "ک",
        **{chr(code): str(code - 0x06F0) for code in range(0x06F0, 0x06FA)},
        **{chr(code): str(code - 0x0660) for code in range(0x0660, 0x066A)},
    }))
    out: list[str] = []
    for char in value:
        if char in {"\u200c", "\u200e", "\u200f"}:
            continue
        if char.isspace() or unicodedata.category(char)[0] in {"P", "S"}:
            out.append(" ")
        else:
            out.append(char)
    return " ".join("".join(out).lower().split())


def normalized_state_group(text: str) -> str:
    return hashlib.sha256(normalize_model_input(text).encode("utf-8")).hexdigest()


def training_split_for_state(text: str) -> str:
    bucket = int(normalized_state_group(text)[:8], 16) % 100
    return "train" if bucket < 80 else "calibration" if bucket < 90 else "test"


def persian_number(value: int) -> str:
    digits = str(value)
    table = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")
    return digits.translate(table)


# ---------------------------------------------------------------- location
def load_cities(rng: random.Random) -> list[dict[str, Any]]:
    cities: list[dict[str, Any]] = []
    for path in sorted(CATALOG_DIR.glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        neighborhoods = data.get("neighborhoods") or []
        if not neighborhoods:
            continue
        names = [
            n["name"]
            for n in neighborhoods
            if isinstance(n, dict) and n.get("name") and len(n["name"].strip()) >= 3
        ]
        if len(names) < 5:
            continue
        cities.append({
            "cityId": data["cityId"],
            "cityName": data["cityName"],
            "neighborhoods": names,
        })
    cities.sort(key=lambda c: c["cityId"])
    return cities


def sample_location(cities: list[dict[str, Any]], rng: random.Random) -> tuple[str, str]:
    big = [c for c in cities if c["cityName"] in CITY_WEIGHT_KEYS]
    if big and rng.random() < 0.55:
        city = rng.choice(big)
    else:
        city = rng.choice(cities)
    return city["cityName"], rng.choice(city["neighborhoods"])


# ---------------------------------------------------------------- templates
def area_phrase(rng: random.Random) -> str:
    value = rng.choice([55, 60, 70, 75, 80, 90, 100, 110, 120, 135, 150, 180,
                        200, 250, 300, 400, 500, 800, 1000])
    return persian_number(value) + " متر"


def rooms_phrase(rng: random.Random, register: str) -> str:
    n = rng.randint(1, 4)
    if register == REGISTER_SPOKEN:
        return rng.choice([f"{persian_number(n)} خوابه", f"{persian_number(n)} اتاق"])
    return f"{persian_number(n)} خواب"


def budget_phrase(rng: random.Random) -> str | None:
    if rng.random() < 0.4:
        value = rng.choice([500, 800, 1000, 1500, 2000, 3000, 4000, 6000,
                            8000, 12000, 15000])
        return f"حداکثر {persian_number(value)} میلیون تومان بودجه دارم"
    return None


def rent_money_phrase(rng: random.Random, txn: str) -> str | None:
    if txn == "rent_rahn_ejare":
        rahn = rng.choice([100, 200, 300, 500, 700, 1000, 1500, 2000, 3000])
        ejare = rng.choice([5, 8, 10, 15, 20, 30, 50])
        return rng.choice([
            f"{persian_number(rahn)} میلیون تومان رهن و {persian_number(ejare)} میلیون اجاره",
            f"رهن {persian_number(rahn)} میلیون و اجارهٔ ماهانه {persian_number(ejare)} میلیون",
            f"{persian_number(rahn)} میلیون ودیعه و {persian_number(ejare)} میلیون اجارهٔ ماهانه",
        ])
    if txn == "rent_monthly":
        if rng.random() > 0.65:
            return None
        ejare = rng.choice([8, 12, 15, 20, 25, 30, 40, 60])
        return rng.choice([
            f"اجارهٔ ماهانه تا {persian_number(ejare)} میلیون تومان",
            f"{persian_number(ejare)} میلیون اجارهٔ ماهانه می‌دهم",
        ])
    if txn == "rent_rahn_full":
        rahn = rng.choice([300, 500, 800, 1200, 2000, 3000])
        return rng.choice([
            f"فقط رهن کامل {persian_number(rahn)} میلیونی",
            f"رهن کامل {persian_number(rahn)} میلیون بدون اجاره",
        ])
    if txn == "rent_short_term":
        if rng.random() > 0.7:
            return None
        daily = rng.choice([500, 800, 1000, 1500, 2000, 3000])
        return rng.choice([
            f"اجارهٔ روزانه تا {persian_number(daily)} هزار تومان",
            f"شبی {persian_number(daily)} هزار تومان",
        ])
    return None


PROPERTY_PREFIX = {
    "apartment": ["آپارتمان", "یک واحد آپارتمان", "واحد مسکونی"],
    "villa": ["خانه", "ویلا", "یک خانهٔ ویلایی", "خانهٔ مستقل"],
    "land": ["زمین", "یک قطعه زمین", "زمین کلنگی"],
    "office": ["دفتر کار", "یک دفتر اداری", "واحد اداری"],
    "shop": ["مغازه", "یک مغازه", "فروشگاه", "واحد تجاری"],
    "industrial": ["سوله", "انبار صنعتی", "کارگاه"],
}

# Prepositional intent verbs; they grammatically fit every construction below.
BUY_VERBS = ["برای خرید", "برای خریداری"]
RENT_VERBS = {
    "rent_rahn_ejare": ["برای رهن و اجاره", "برای اجاره"],
    "rent_rahn_full": ["برای رهن کامل"],
    "rent_monthly": ["برای اجاره", "برای کرایه"],
    "rent_short_term": ["برای اجارهٔ کوتاه‌مدت", "برای اجارهٔ روزانه", "برای چند روز"],
}


def intent_verb(rng: random.Random, txn: str) -> str:
    if txn == "buy":
        return rng.choice(BUY_VERBS)
    return rng.choice(RENT_VERBS[txn])


def purpose_fragment(rng: random.Random, category: str) -> str | None:
    purposes = {
        "office-rent": ["برای دفتر شرکتم", "برای فعالیت اداری", "برای استقرار دفتر"],
        "office-sale": ["برای دفتر شرکتم", "برای مطب", "برای فعالیت اداری"],
        "shop-rent": ["برای فروش لوازم خانگی", "برای فروشگاه پوشاک",
                      "برای راه‌اندازی کسب‌وکارم", "برای مغازه‌داری"],
        "shop-sale": ["برای کسب‌وکار خودم", "برای راه‌اندازی فروشگاه"],
        "industrial-rent": ["برای انبارداری", "برای تولید کارگاهی", "برای تعمیرگاه"],
        "industrial-sale": ["برای تولید صنعتی", "برای ساخت کارخانه", "برای انبار"],
        "suite-apartment-rent": ["برای اقامت چند روزه", "برای سفر کاری",
                                 "برای پذیرایی از میهمان"],
        "villa-short-rent": ["برای تفریح خانوادگی", "برای آخر هفته", "برای دورهمی"],
        "workspace-short-rent": ["برای جلسهٔ کاری", "برای کلاس آموزشی", "برای استودیو"],
        "agency-services": ["برای پیدا کردن ملک مناسب", "برای مشاورهٔ خرید ملک"],
        "construction-partnership": ["برای مشارکت در ساخت",
                                     "برای همکاری در پروژهٔ ساختمانی"],
        "pre-sale-services": ["برای پیش‌خرید واحد", "برای پیش‌خرید آپارتمان در حال ساخت"],
    }
    options = purposes.get(category)
    return rng.choice(options) if options else None


def amenity_fragment(rng: random.Random) -> str | None:
    extras = [
        "با پارکینگ", "با آسانسور", "با پارکینگ و آسانسور", "با انباری",
        "نورگیر باشد", "طبقهٔ همکف باشد", "بالکن داشته باشد",
        "پارکینگ اختصاصی داشته باشد", "تازه‌ساز باشد",
    ]
    return rng.choice(extras) if rng.random() < 0.45 else None


def neighborhood_fragment(rng: random.Random, city: str, neighborhood: str) -> str:
    """Persian location phrase. Never prefixes a duplicate generic word when the
    catalog neighborhood name already contains one («محلهٔ محلهٔ X»)."""
    self_describing = any(
        word in neighborhood for word in ("محله", "منطقه", "شهرک", "شهر", "باغ")
    )
    if self_describing:
        base = neighborhood if rng.random() < 0.5 else f"محدودهٔ {neighborhood}"
    else:
        cue = rng.choice(["محدودهٔ", "حوالی", "محدوده", "نزدیکی"])
        base = f"{cue} {neighborhood}"
    if rng.random() < 0.5:
        return f"{base} {city}"
    return f"{base}، {city}"


def service_sentence(rng: random.Random, category: str, city: str,
                     neighborhood: str) -> str:
    loc = neighborhood_fragment(rng, city, neighborhood)
    if category == "agency-services":
        # No property noun: the correct property_kind here is `unknown`.
        return rng.choice([
            f"برای خرید ملک به مشاور املاک مطمئن نیاز دارم، {loc}",
            f"دنبال یک مشاور املاک برای خرید ملک در {loc} هستم",
            f"می‌خواهم در {loc} ملکی بخرم و مشاور املاک لازم دارم",
        ]) + "."
    if category == "construction-partnership":
        return rng.choice([
            f"زمینی در {loc} دارم و برای مشارکت در ساخت دنبال سازنده می‌گردم",
            f"برای مشارکت در ساخت روی زمینی در {loc} نیاز به همکاری سازنده دارم",
            f"در {loc} زمین دارم و می‌خواهم با پیمانکار مشارکت در ساخت داشته باشم",
        ]) + "."
    if category == "pre-sale-services":
        return rng.choice([
            f"یک واحد آپارتمان در حال ساخت در {loc} برای پیش‌خرید می‌خواهم",
            f"برای پیش‌خرید آپارتمان در {loc} برنامهٔ خرید دارم",
            f"دنبال واحد پیش‌فروش شده برای خرید در {loc} هستم",
        ]) + "."
    return f"{purpose_fragment(rng, category)} در {loc} نیاز دارم."


def build_sentence(rng: random.Random, category: str, kind: str, txn: str,
                   city: str, neighborhood: str) -> str:
    if category in {"agency-services", "construction-partnership", "pre-sale-services"}:
        return service_sentence(rng, category, city, neighborhood)

    register = rng.choice(REGISTERS)
    noun = rng.choice(PROPERTY_PREFIX[kind])
    area = area_phrase(rng)
    loc = neighborhood_fragment(rng, city, neighborhood)
    verb = intent_verb(rng, txn)

    room_part = ""
    if kind in {"apartment", "villa"} and rng.random() < 0.5:
        room_part = rooms_phrase(rng, register)

    money = rent_money_phrase(rng, txn) if txn != "buy" else None
    budget = budget_phrase(rng) if txn == "buy" else None
    purpose = purpose_fragment(rng, category)
    amenity = amenity_fragment(rng)

    style = rng.random()
    if style < 0.30:
        # wish: «ویلا ۲۵۰ متر در محدودهٔ فلان مشهد برای خرید می‌خواهم»
        text = f"{noun} {area} در {loc} {verb} می‌خواهم"
        if room_part:
            text += f" {room_part}"
        if purpose:
            text += f" {purpose}"
        if money:
            text += f"، {money}"
        if budget:
            text += f"، {budget}"
        if amenity:
            text += f" و {amenity}"
    elif style < 0.55:
        # search: «دنبال … هستم، برای …»
        text = f"دنبال {noun} {area} در {loc} هستم"
        if purpose:
            text += f" {purpose}"
        else:
            text += f" {verb}"
        if room_part:
            text += f" {room_part}"
        if money:
            text += f"؛ {money}"
        if budget:
            text += f"؛ {budget}"
        if amenity:
            text += f" و {amenity}"
    elif style < 0.80:
        # need: «برای … به … نیاز دارم»
        text = f"{verb} به {noun} {area} در {loc} نیاز دارم"
        if purpose:
            text += f" {purpose}"
        if room_part:
            text += f" {room_part}"
        if money:
            text += f"؛ {money}"
        if budget:
            text += f"؛ {budget}"
        if amenity:
            text += f" و {amenity}"
    else:
        # spoken wish: «می‌خوام یک آپارتمان … برای خرید بگیرم»
        opener = rng.choice(["می‌خوام", "می‌خوهم", "می‌خوایم"])
        text = f"{opener} {noun} {area} در {loc} {verb} بگیرم"
        if purpose:
            text += f" {purpose}"
        if room_part:
            text += f" {room_part}"
        if money:
            text += f"، {money}"
        if budget:
            text += f"، {budget}"
        if amenity:
            text += f" و {amenity}"

    return text + "."


# ---------------------------------------------------------------- questions
def question_contract() -> dict[str, Any]:
    return {
        "transaction_type": {
            "type": "choice",
            "instructions": (
                "نوع معامله را از متن نیاز مشخص کن. فقط گزینه‌ای را انتخاب کن که شواهد "
                "روشن دارد؛ اگر نوع معامله گفته نشده unknown را انتخاب کن."
            ),
            "criteria": {
                "buy": "کاربر به خرید اشاره می‌کند یا نشانه‌های روشن آن در متن وجود دارد.",
                "sell": "کاربر به فروش اشاره می‌کند یا نشانه‌های روشن آن در متن وجود دارد.",
                "rent_monthly": "کاربر به اجاره ماهانه اشاره می‌کند یا نشانه‌های روشن آن در متن وجود دارد.",
                "rent_rahn_full": "کاربر به رهن کامل اشاره می‌کند یا نشانه‌های روشن آن در متن وجود دارد.",
                "rent_rahn_ejare": "کاربر به رهن و اجاره اشاره می‌کند یا نشانه‌های روشن آن در متن وجود دارد.",
                "rent_short_term": "کاربر به اجاره کوتاه‌مدت (روزانه) اشاره می‌کند یا نشانه‌های روشن آن در متن وجود دارد.",
                "unknown": "در متن ذکر نشده؛ حدس نزن",
            },
        },
        "property_kind": {
            "type": "choice",
            "instructions": (
                "نوع ملک را از متن فارسی تشخیص بده. بین آپارتمان، خانه/ویلا، زمین، دفتر "
                "کار، مغازه و صنعتی انتخاب کن؛ اگر روشن نیست unknown."
            ),
            "criteria": {
                "apartment": "کاربر به آپارتمان اشاره می‌کند یا نشانه‌های روشن آن در متن وجود دارد.",
                "villa": "کاربر به خانه / ویلا اشاره می‌کند یا نشانه‌های روشن آن در متن وجود دارد.",
                "land": "کاربر به زمین اشاره می‌کند یا نشانه‌های روشن آن در متن وجود دارد.",
                "office": "کاربر به دفتر کار اشاره می‌کند یا نشانه‌های روشن آن در متن وجود دارد.",
                "shop": "کاربر به مغازه اشاره می‌کند یا نشانه‌های روشن آن در متن وجود دارد.",
                "industrial": "کاربر به صنعتی اشاره می‌کند یا نشانه‌های روشن آن در متن وجود دارد.",
                "unknown": "در متن ذکر نشده؛ حدس نزن",
            },
        },
        # Instruction and per-leaf meanings copied verbatim from
        # src/lib/need-intake/laya/post-decision-questions.ts so training and
        # /api/post/natural-analyze render identical question text.
        "category_candidate": {
            "type": "choice",
            "instructions": (
                "دسته را فقط از شواهد نوع ملک و معامله/خدمت تعیین کن؛ اجارهٔ بلندمدت با "
                "اقامت کوتاه‌مدت فرق دارد. اگر مبهم است unknown؛ گزینه‌ای نساز."
            ),
            "criteria": {
                "apartment-sale": "خرید آپارتمان یا واحد مسکونی؛ فروش، نه اجاره.",
                "apartment-rent": "اجارهٔ بلندمدت آپارتمان مسکونی؛ نه اقامت شبانه.",
                "villa-sale": "خرید خانهٔ مستقل، ویلایی یا باغ‌ویلا.",
                "villa-rent": "اجارهٔ بلندمدت خانه یا ویلای مستقل؛ نه سفر چندروزه.",
                "land-sale": "خرید زمین، قطعه زمین یا ملک کلنگی.",
                "land-rent": "اجارهٔ زمین یا ملک کلنگی.",
                "office-sale": "خرید دفتر کار، واحد اداری یا مطب.",
                "office-rent": "اجارهٔ بلندمدت دفتر کار، واحد اداری یا مطب.",
                "shop-sale": "خرید مغازه، فروشگاه، واحد تجاری یا غرفه.",
                "shop-rent": "اجارهٔ بلندمدت مغازه، فروشگاه، واحد تجاری یا غرفه.",
                "industrial-sale": "خرید سوله، کارخانه یا ملک صنعتی.",
                "industrial-rent": "اجارهٔ بلندمدت سوله، کارخانه یا ملک صنعتی.",
                "suite-apartment-rent": "اقامت کوتاه‌مدت یا شبانه در سوئیت/آپارتمان مبله.",
                "villa-short-rent": "اجارهٔ کوتاه‌مدت یا تفریحی ویلا و باغ.",
                "workspace-short-rent": "اجارهٔ کوتاه‌مدت فضای کار، جلسه یا آموزش.",
                "agency-services": "خدمت مشاور املاک برای یافتن ملک یا واسطه‌گری؛ نه خود ملک.",
                "construction-partnership": "مشارکت در ساخت یا همکاری سازنده روی زمین/پروژه.",
                "pre-sale-services": "پیش‌خرید یا پیش‌فروش واحد در حال ساخت.",
                "unknown": (
                    "نوع ملک یا معامله/خدمت از متن روشن نیست؛ شهر، محله، متراژ یا بودجه "
                    "به‌تنهایی کافی نیست؛ حدس نزن."
                ),
            },
        },
    }


# ---------------------------------------------------------------- generator
def generate_rows(total: int, seed: int) -> Iterator[dict[str, Any]]:
    rng = random.Random(seed)
    cities = load_cities(rng)

    plan: list[tuple[str, str, str]] = []
    for category, (kind, txn, count) in CATEGORY_PLAN.items():
        plan.extend([(category, kind, txn)] * count)
    rng.shuffle(plan)

    seen: set[str] = set()
    emitted = 0
    # regenerate on collision, but keep the plan count exact
    for category, kind, txn in plan:
        text: str | None = None
        for _ in range(12):
            city, neighborhood = sample_location(cities, rng)
            candidate = build_sentence(rng, category, kind, txn, city, neighborhood)
            group = normalized_state_group(candidate)
            if group in seen:
                continue
            seen.add(group)
            text = candidate
            break
        if text is None:
            # last resort: append a distinguishing detail, still category-consistent
            city, neighborhood = sample_location(cities, rng)
            suffix = f" {persian_number(emitted + 1)}"
            text = build_sentence(rng, category, kind, txn, city, neighborhood) + suffix
            text = text.replace("..", ".")
            seen.add(normalized_state_group(text))

        emitted += 1
        targets: dict[str, Any] = {
            "category_candidate": {
                "value": category,
                "source": "deterministic_fa_template_from_catalog_label",
                "humanReviewed": False,
            },
            "property_kind": {
                "value": kind,
                "source": "deterministic_fa_template_from_catalog_label",
                "humanReviewed": False,
            },
            "transaction_type": {
                "value": txn,
                "source": "deterministic_fa_template_from_catalog_label",
                "humanReviewed": False,
            },
        }
        yield {
            "schemaVersion": DATA_VERSION,
            "taskType": DATA_TASK,
            "exampleId": f"niazfinder-fa-buyer-{emitted:05d}",
            "synthetic": True,
            "derivedFromSupplyListing": False,
            "isNeedGroundTruth": False,
            "realNeedGroundTruth": False,
            "trainingEligible": False,
            "shadowOnly": False,
            "datasetTag": DATASET_TAG,
            "source": {
                "dataset": SOURCE_DATASET,
                "splitGroup": f"fa-template-{emitted:05d}",
            },
            "state": text,
            "stateTruncated": False,
            "hypotheticalNeed": {
                "taskType": DATA_TASK,
                "schemaVersion": DATA_VERSION,
                "exampleId": f"niazfinder-fa-buyer-{emitted:05d}",
                "realNeedGroundTruth": False,
                "trainingEligible": False,
                "generation": {
                    "method": "deterministic-counterfactual-template",
                    "version": DATA_VERSION,
                },
                "targetDecisions": targets,
                "originalSplit": training_split_for_state(text),
                "trainingSplit": training_split_for_state(text),
                "sourceOfferGroup": f"fa-template-{emitted:05d}",
            },
        }
        if emitted >= total:
            return


def read_states(path: Path) -> Iterator[str]:
    with path.open(encoding="utf-8") as stream:
        for line in stream:
            if line.strip():
                yield json.loads(line)["state"]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--total", type=int, default=TARGET_TOTAL)
    parser.add_argument("--seed", type=int, default=20261001)
    parser.add_argument("--out", type=Path, default=None)
    args = parser.parse_args()

    out = args.out or (OUT_DIR / "laya-fa-buyer-10k-v1.jsonl")
    out.parent.mkdir(parents=True, exist_ok=True)

    splits: Counter[str] = Counter()
    categories: Counter[str] = Counter()
    with out.open("w", encoding="utf-8") as stream:
        for row in generate_rows(args.total, args.seed):
            stream.write(json.dumps(row, ensure_ascii=False) + "\n")
            splits[row["hypotheticalNeed"]["trainingSplit"]] += 1
            categories[row["hypotheticalNeed"]["targetDecisions"]["category_candidate"]["value"]] += 1

    manifest = {
        "schemaVersion": DATA_VERSION,
        "taskType": DATA_TASK,
        "datasetTag": DATASET_TAG,
        "model": MODEL_ID,
        "modelRevision": MODEL_REVISION,
        "seed": args.seed,
        "rows": sum(splits.values()),
        "outputRows": sum(splits.values()),
        "rowsBySplit": dict(splits),
        "categories": dict(categories),
        "sourceFile": out.name,
        "outputBytes": out.stat().st_size,
        "outputSha256": hashlib.sha256(out.read_bytes()).hexdigest(),
        "uniqueNormalizedStateGroups": len({normalized_state_group(r) for r in read_states(out)}),
        "trainingSplitCounts": dict(splits),
        "generatedAt": "2026-10-01",
        "labelsAreDeterministicFromTemplate": True,
        "layaPredictionsUsedAsLabels": False,
        "realNeedGroundTruth": False,
        "trainingEligible": False,
    }
    manifest_path = out.with_suffix(out.suffix + ".manifest.json")
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), "utf-8")

    questions_path = out.with_name(out.stem + ".questions.json")
    questions_path.write_text(
        json.dumps(question_contract(), ensure_ascii=False, indent=2), "utf-8"
    )

    print(json.dumps({
        "out": str(out),
        "rows": sum(splits.values()),
        "splits": dict(splits),
        "categories": len(categories),
        "manifest": str(manifest_path),
        "questions": str(questions_path),
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
