# Composer Loop Control — Post Understanding

**Mode:** Dynamic · AI-managed (Composer present each wake)  
**Not:** Passive sleep-only ticker

## Protocol

On every `AGENT_LOOP_WAKE_composer_post`:

1. Composer reads latest tick in `11-COMPOSE-LOOP-TICK.md`
2. Runs regression pack (+ deep checks if prior tick green)
3. If red → diagnose root cause → fix → retest → append tick
4. If green → append tick; choose next delay:
   - After fail/fix: **90s** (tight)
   - After green: **180s** (3m) while confirming exit
   - After 2 consecutive full-green + Audit 09 closed: **stop** (or ask user)

## Active PID / wake

Documented in `11-COMPOSE-LOOP-TICK.md` each arm.

## Stop

User says stop → kill sleeper PID → do not re-arm.
