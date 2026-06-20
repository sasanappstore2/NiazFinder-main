"""SSRF guards for business_import fetch — mirrors Next.js validate-url.ts."""
from __future__ import annotations

import ipaddress
import socket
from urllib.parse import urlparse

BLOCKED_HOSTNAMES = frozenset(
    {
        "localhost",
        "127.0.0.1",
        "0.0.0.0",
        "::1",
        "metadata.google.internal",
    }
)


def _is_private_ip(host: str) -> bool:
    try:
        addr = ipaddress.ip_address(host)
        return addr.is_private or addr.is_loopback or addr.is_link_local
    except ValueError:
        return False


def is_safe_fetch_url(url: str) -> bool:
    try:
        parsed = urlparse(url.strip())
    except Exception:
        return False

    if parsed.scheme not in ("http", "https"):
        return False

    hostname = (parsed.hostname or "").lower()
    if not hostname or hostname in BLOCKED_HOSTNAMES:
        return False

    try:
        # Literal IP
        ipaddress.ip_address(hostname)
        return not _is_private_ip(hostname)
    except ValueError:
        pass

    try:
        for info in socket.getaddrinfo(hostname, None):
            addr = info[4][0]
            if _is_private_ip(addr):
                return False
    except OSError:
        return False

    return True
