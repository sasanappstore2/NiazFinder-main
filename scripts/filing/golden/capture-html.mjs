#!/usr/bin/env node
/**
 * Manual HTML capture helper for filing portal fixtures.
 *
 * 1. Log into the portal in Chrome
 * 2. Open DevTools → Elements → right-click <html> → Copy → Copy outerHTML
 * 3. Save to fixtures/filing-portals/{site}/{name}.html
 *
 * Or: File → Save Page As → "Web Page, HTML only"
 *
 * Do NOT commit credentials. Strip session tokens before saving.
 */
console.log(`
Filing portal fixture capture
=============================
Save HTML under:
  fixtures/filing-portals/{showmelk|maskanyaban}/

Recommended files:
  - home.html
  - login.html
  - list-sample.html (list page with many cards)
  - list-page-2.html (pagination sample)

Then run:
  npm run test:filing-discovery
`);
