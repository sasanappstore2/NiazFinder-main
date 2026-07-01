#!/usr/bin/env python3
"""Generate large multi-city filing portal fixture for offline batch tests."""

from __future__ import annotations

import random
from pathlib import Path

CITIES = [
    "مشهد", "تهران", "اصفهان", "شیراز", "تبریز", "کرج", "اهواز", "قم", "کرمانشاه", "رشت",
    "ارومیه", "زاهدان", "کرمان", "همدان", "یزد", "اردبیل", "بندرعباس", "قزوین", "سنندج", "خرم‌آباد",
    "گرگان", "ساری", "بوشهر", "ایلام", "بیرجند", "زنجان", "سمنان", "شهرکرد", "یاسوج", "بجنورد",
    "کاشان", "نجف‌آباد", "آبادان", "دزفول", "مراغه", "مرودشت", "سبزوار", "نیشابور", "ملارد", "ورامین",
    "پاکدشت", "شهریار", "اندیشه", "قدس", "شاهین‌شهر", "فولادشهر", "لاهیجان", "بابل", "آمل", "قائم‌شهر",
]

DEALS = ["رهن و اجاره", "فروش", "رهن کامل", "اجاره"]
KINDS = ["آپارتمان", "ویلا", "مغازه", "زمین", "دفتر"]


def card_html(city: str, idx: int) -> str:
    deal = random.choice(DEALS)
    kind = random.choice(KINDS)
    code = 900_000 + hash(city) % 10_000 + idx
    area = random.randint(45, 220)
    nb = f"{city} - محله {idx + 1}"
    price_block = ""
    if deal == "فروش":
        price_block = f'<div class="field-row"><span class="label">قیمت:</span><span class="value">{random.randint(3, 15):,},000,000,000</span></div>'
    elif deal == "رهن کامل":
        price_block = f'<div class="field-row"><span class="label">مبلغ رهن:</span><span class="value">{random.randint(1, 8):,},000,000,000</span></div>'
    else:
        price_block = (
            f'<div class="field-row"><span class="label">مبلغ رهن:</span><span class="value">{random.randint(200, 900):,},000,000</span></div>'
            f'<div class="field-row"><span class="label">مبلغ اجاره:</span><span class="value">{random.randint(8, 35):,},000,000</span></div>'
        )
    return f"""
  <div class="listing-item property-card" data-file-id="{code}">
    <div class="card-header"><span class="deal-badge">{deal}</span> <span class="kind-badge">{kind}</span></div>
    <div class="card-body">
      <div class="field-row"><span class="label">کد فایل:</span><span class="value">{code}</span></div>
      <div class="field-row"><span class="label">متراژ:</span><span class="value">{area} متری</span></div>
      <div class="field-row"><span class="label">محله:</span><span class="value">{nb}</span></div>
      {price_block}
      <div class="field-row"><span class="label">طبقه:</span><span class="value">{random.randint(1, 12)}</span></div>
    </div>
    <a class="detail-link" href="/file/{code}">مشاهده</a>
  </div>"""


def main() -> None:
    random.seed(42)
    out_dir = Path(__file__).resolve().parents[2] / "fixtures/filing-portals/iran-batch"
    out_dir.mkdir(parents=True, exist_ok=True)
    cards: list[str] = []
    for city in CITIES:
        for i in range(20):
            cards.append(card_html(city, i))
    html = f"""<!DOCTYPE html>
<html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>لیست فایلینگ ایران</title></head>
<body><div id="fileListContainer" class="listing-grid">
{''.join(cards)}
</div></body></html>"""
    path = out_dir / "list-50cities-x20.html"
    path.write_text(html, encoding="utf-8")
    print(f"Wrote {path} ({len(CITIES)} cities × 20 = {len(cards)} cards)")


if __name__ == "__main__":
    main()
