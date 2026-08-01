"""Parse MaskanYaban list/detail posted-at strings."""

from __future__ import annotations

import re
from datetime import datetime, timedelta

PERSIAN_DIGITS = str.maketrans("۰۱۲۳۴۵۶۷۸۹", "0123456789")
ARABIC_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")

JALALI_MONTHS = [
    "فروردین",
    "اردیبهشت",
    "خرداد",
    "تیر",
    "مرداد",
    "شهریور",
    "مهر",
    "آبان",
    "آذر",
    "دی",
    "بهمن",
    "اسفند",
]


def _ascii_digits(text: str) -> str:
    return text.translate(PERSIAN_DIGITS).translate(ARABIC_DIGITS)


def _jalali_to_gregorian(jy: int, jm: int, jd: int) -> tuple[int, int, int] | None:
    """Minimal jalaali→gregorian (same algorithm as TS jalaali lib)."""
    if jm < 1 or jm > 12 or jd < 1:
        return None
    jy -= 979
    jm -= 1
    jd -= 1
    j_day_no = 365 * jy + (jy // 33) * 8 + ((jy % 33 + 3) // 4)
    for i in range(jm):
        j_day_no += 31 if i < 6 else 30
    j_day_no += jd
    g_day_no = j_day_no + 79
    gy = 1600 + 400 * (g_day_no // 146097)
    g_day_no %= 146097
    leap = True
    if g_day_no >= 36525:
        g_day_no -= 1
        gy += 100 * (g_day_no // 36524)
        g_day_no %= 36524
        if g_day_no >= 365:
            g_day_no += 1
        else:
            leap = False
    gy += 4 * (g_day_no // 1461)
    g_day_no %= 1461
    if g_day_no >= 366:
        leap = False
        g_day_no -= 1
        gy += g_day_no // 365
        g_day_no %= 365
    sal_a = [0, 31, 29 if leap else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    gm = 0
    while gm < 13 and g_day_no >= sal_a[gm]:
        g_day_no -= sal_a[gm]
        gm += 1
    return gy, gm, g_day_no + 1


def parse_maskanyaban_posted_at(text: str | None) -> datetime | None:
    if not text or not str(text).strip():
        return None
    raw = str(text).strip()

    us = re.match(
        r"(\d{1,2})/(\d{1,2})/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM))?",
        raw,
        re.I,
    )
    if us:
        month, day, year = int(us.group(1)), int(us.group(2)), int(us.group(3))
        hour = minute = second = 0
        if us.group(4):
            hour = int(us.group(4))
            minute = int(us.group(5) or 0)
            second = int(us.group(6) or 0)
            ampm = (us.group(7) or "").upper()
            if ampm == "PM" and hour < 12:
                hour += 12
            if ampm == "AM" and hour == 12:
                hour = 0
        try:
            return datetime(year, month, day, hour, minute, second)
        except ValueError:
            pass

    jalali = re.search(r"(\d{1,2})\s+([\u0600-\u06FF\u200c]+)\s+(\d{4})", raw)
    if jalali:
        jd = int(_ascii_digits(jalali.group(1)))
        jy = int(_ascii_digits(jalali.group(3)))
        month_name = jalali.group(2).replace("\u200c", "").strip()
        jm = next(
            (i + 1 for i, name in enumerate(JALALI_MONTHS) if name in month_name or month_name in name),
            0,
        )
        if jd and jy and jm:
            g = _jalali_to_gregorian(jy, jm, jd)
            if g:
                return datetime(g[0], g[1], g[2])

    return None


def cutoff_datetime(within_days: int) -> datetime:
    return datetime.now() - timedelta(days=within_days)


def row_within_days(row: dict, cutoff: datetime | None) -> bool:
    if cutoff is None:
        return True
    posted = parse_maskanyaban_posted_at(row.get("postedAt"))
    if posted is None:
        return True
    return posted >= cutoff


def page_entirely_before_cutoff(rows: list[dict], cutoff: datetime) -> bool:
    dated = [parse_maskanyaban_posted_at(row.get("postedAt")) for row in rows]
    parseable = [d for d in dated if d is not None]
    if not parseable:
        return False
    return max(parseable) < cutoff
