#!/usr/bin/env bash
# Push main to https://github.com/sasanappstore2/NiazFinder-main
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

if ! command -v gh >/dev/null 2>&1; then
  echo "Install GitHub CLI: brew install gh"
  exit 1
fi

if ! gh auth status -h github.com >/dev/null 2>&1; then
  echo "Not logged in. Opening browser for GitHub login (account: sasanappstore2)..."
  gh auth login -h github.com -p https -w -s repo
fi

echo "Fetching origin..."
git fetch origin main

echo "Pushing main..."
git push -u origin main

echo "Done: https://github.com/sasanappstore2/NiazFinder-main"
