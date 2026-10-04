# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project does not yet use semantic versioning for releases (`0.2.x`, unreleased).

## [Unreleased]

### Added
- Public-repository readiness: README, SECURITY.md, CODE_OF_CONDUCT.md,
  CONTRIBUTING.md, issue/PR templates, minimal CI (typecheck, lint,
  offline intake self-tests).
- Private Laya Multilingual worker (`mini-services/laya-post`) behind
  `/api/post/natural-analyze` (loopback-only, confidence-gated, auto-apply off).
- Go chat service (`mini-services/chat-go`) in development.
- Wallet + Zarinpal top-up, lead pricing tiers, one-time subscription deductions.
- Capacitor iOS shell (`mobile/`, in progress).

### Security
- Internal routes fail closed on missing/mismatched `INTERNAL_API_SECRET`.
- Test OTP hard-gated to non-production.
- Previously committed `.env` files untracked (secret rotation still required —
  see SECURITY.md).
