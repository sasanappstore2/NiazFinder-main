# 18 — Git Rules

Aligned with user commit/PR rules. **Cursor must obey these even if faster not to.**

---

## Commits

1. **Do not commit unless the user explicitly asks.**
2. Do not `git commit --amend` unless user rules’ amend conditions are met.
3. Never update git config.
4. Never `--no-verify` / skip hooks unless user explicitly requests.
5. Never force-push `main`/`master`; warn if asked.
6. No `-i` interactive git commands.
7. Commit messages in **English**, concise, focus on **why**.
8. Use HEREDOC for message body when committing.
9. Do not commit secrets (`.env.local`, keys, credentials).
10. Do not push unless user explicitly asks.

When asked to commit:

1. Parallel: `git status`, `git diff`, `git log` (style)
2. Stage relevant files only
3. Commit
4. `git status` verify
5. If hook fails: fix + **new** commit (do not amend failed commit)

---

## Pull requests

When asked to create a PR:

1. Status/diff/log vs base; check tracking
2. Push with `-u` if needed (requires appropriate permissions)
3. `gh pr create` with HEREDOC summary + test plan
4. Return PR URL

---

## Branch hygiene

- Prefer feature branches for large work
- Do not mix unrelated refactors with feature commits
- Keep OS doc updates with the behavioral change when Current truth shifts

---

## Diff discipline

- No drive-by files
- No generated junk
- No `intake.backup` edits
- Review `git status` before claiming done
