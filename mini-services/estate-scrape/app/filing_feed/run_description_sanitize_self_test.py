#!/usr/bin/env python3
from app.filing_feed.description_sanitize import (
    extract_broker_meta_from_description,
    sanitize_description_text,
)

BROKER = "\u06a9\u0627\u0631\u06af\u0632\u0627\u0631\u06cc"  # کارگzاری


def test_inline_broker_cut() -> None:
    polluted = (
        f"توضیحات ملک به خدا سلام ۲۲۰ متر دونبش "
        f"آسانسور پارکینگ انباری کمد دیواری گاز روکار "
        f"دفتر {BROKER} مسکن خانه من آدرس: چهارراه فرامرز عباسی"
    )
    cleaned = sanitize_description_text(polluted)
    assert cleaned is not None
    assert BROKER not in cleaned
    assert "آدرس" not in cleaned
    assert "به خدا سلام" in cleaned
    meta = extract_broker_meta_from_description(polluted)
    assert meta.get("brokerOffice") == "مسکن خانه من"
    assert meta.get("brokerAddress") == "چهارراه فرامرز عباسی"
    print("[OK] inline broker cut")


def test_footer_cut() -> None:
    polluted = "با سلام واحد فروشی\nدفتر کارگzاری نوین\nآدرس:\nخیابان\nدر صورتی که مشترک سایت"
    polluted = polluted.replace("کارگzاری", BROKER)
    cleaned = sanitize_description_text(polluted)
    assert cleaned == "با سلام واحد فروشی"
    print("[OK] footer cut")


def main() -> None:
    test_inline_broker_cut()
    test_footer_cut()
    print("description sanitize self-test passed")


if __name__ == "__main__":
    main()
