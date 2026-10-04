# Laya Multilingual fine-tuning readiness

This report records data eligibility and fine-tuning readiness for the `/post`
intake model. Corpus audits are aggregate-only. Checked-in Persian acceptance
fixtures exercise deterministic extraction and the API contract; they do not
run Laya inference or establish model accuracy. The separate Divar shadow pilot
runs only `convaiinnovations/laya-multilingual` locally and does not create
gold training labels or start fine-tuning.

## Findings (2026-09-25)

- The current location catalog contains 1,207 cities and 48,110 neighborhoods;
  the category catalog contains 129 nodes and 107 leaves. These are coverage
  targets, not evidence that examples exist for each item.
- `reports/smart-marketplace-clean.jsonl` has 408,790 rows and its manifest
  records an input basename and curation counts, but no license, consent, human
  label-review, or source-evidence attestation.
- `reports/smart-marketplace-curated.jsonl` has 383,495 rows. Its manifest says
  `manual-ai-curation-v1`; `reports/smart-marketplace-curation-log.md` marks
  only rows 1–200 reviewed and rows 201–408,790 queued. This is not an eligible
  supervised corpus for this checkpoint.
- The 2026-09-25 aggregate-only audit found, in the clean corpus, category
  labels on 362,770 rows, city labels on 308,626, and neighborhood labels on
  406,288. The curated corpus has category labels on 362,770 rows, city labels
  on 283,334, and neighborhood labels on 380,993. Both had zero malformed
  records, missing text/labels, normalized duplicates, or obvious phone/email
  matches; these checks do not establish full PII clearance or label quality.
- Both corpora had zero rows with per-row training consent, source provenance,
  human label review, or Laya typed-decision targets. The clean corpus covers
  38 categories, 811 cities, and 18,129 neighborhoods; the curated corpus
  covers the same. These are below the live catalog's 107 leaves, 1,207 cities,
  and 48,110 neighborhoods. The audit qualifies 0/408,790 clean rows and
  0/383,495 curated rows for training. These counts were independently
  re-run on 2026-09-25; the corpus files are unchanged from their June manifests.
- `data/divar/crawl/raw-posts.json` contains 1,200 crawler rows covering 4
  cities, 504 neighborhoods, and 3 verticals. Aggregate checks found no
  consent, row provenance, human review, or typed-decision metadata. It is not
  eligible for training. The 17 site-crawl runs (84,453 visited URLs) are
  browser/route QA summaries, not labeled need-intake examples.
- A field-only local audit of those 1,200 rows (no title or description values
  emitted) found 823 real-estate listings: 16 of the app's 18 property leaves,
  all in Tehran, Mashhad, Isfahan, and Shiraz, across 400 distinct neighborhood
  strings. This is useful as a catalog-coverage smoke sample, but it is only
  0.0823% of the one-million target and covers 4/1,207 cities and 400/48,110
  neighborhood entries. The remaining 377 rows belong to non-property
  verticals and are excluded from the user's current real-estate-first phase.
  The uncovered app property leaves are `land-rent` and `agency-services`.
- The crawl row schema has `title`, `priceText`, `citySlug`, `district`,
  `nfSlug`, and `vertical`, but no full listing description. A title-only,
  aggregate resolver check against catalog-mappable district metadata found
  556/823 rows with one unique catalog label; only 110 of those titles
  contained the exact normalized expected name/area. The resolver agreed with
  the metadata for 49/556, returned a different unique label for 19, was
  ambiguous for 22, and returned no hit for 466. These are proxy concordance
  counts, not accuracy: crawl labels are unreviewed, 267 records lack one
  unique catalog mapping, and listing titles are not natural-language need
  descriptions. Do not train or calibrate from this comparison.
- `data/divar/research/` has 17 category files, but their aggregate
  `sampleCount` totals only 90 titles, all for Tehran and only three categories
  (`apartment-sale`, `land-sale`, `villa-sale`); the other 14 categories have
  zero samples. Counts are not assumed unique against the 1,200-row crawl.
  This research index is not a million-row corpus and does not fill the city's
  or neighborhood coverage gap.
- `data/intake-testset/verified` is not a human-verified corpus: the assembly
  script describes the chunks as “LLM-verified”, and the rows only carry text,
  category, tone, and vertical. Generated rows are not training evidence.
- The `intake-human-marathon` data comes from a template/tone composer; it is
  generated and excluded. `intake-marathon` also includes outputs from another
  model and is excluded. `scripts/stress/run-real-user-intake-batch.ts` is also
  a fixed, hand-authored parser QA fixture (the “real-user” name means
  real-user-style, not observed user records); its reports are test evidence,
  not training examples. No generated or AI-labeled rows are silently promoted
  to real, human-confirmed labels.
- The app's `IntakeTrainingExample` stores `reviewed`, corrections, and
  `sourceTextHash`, but has no explicit model-training consent field. On
  2026-09-25 PostgreSQL was healthy; aggregate-only queries found zero
  `ServiceRequest` rows, zero training rows, zero reviewed examples, zero
  corrections, and no consent-related column. The publish route calls training
  capture without consent evidence, so current publishes do not enter the
  training table. Important implementation gap: although the TypeScript type
  comments call `trainingConsent` server-verified, the runtime capture guard
  currently checks only non-empty actor/policy strings and a parseable date; it
  does not verify a consent record, scope, current policy version, or actor
  against the authenticated publisher, and the table persists no consent
  evidence. The existing caller passes no consent object, which currently
  fails closed, but a future caller could bypass that protection by constructing
  the loose object. The consent self-test covers missing and malformed consent,
  not fabricated-but-well-formed consent. Add a durable, server-verifiable
  consent record and negative tests before enabling first-party capture. No
  source text was read or exported.
- The local post-intake telemetry files contain 1,321 event rows. Their schema
  records wizard steps, field changes, validation, publish attempts, and
  drop-offs; it does not provide a consented source-need/typed-decision corpus.
  Field-change payloads may contain user-entered values, so the telemetry was
  not treated as training data.
- `mini-services/estate-scrape` builds estate-knowledge Q&A from scraped
  articles and invokes its Qwen client. That output is neither authentic user
  needs nor eligible for this Laya-only task and is excluded.
- `scripts/datasets/prepare-intake-finetune.ts` converts the legacy
  `smart-marketplace` labels into assistant JSON text (including a synthetic
  transform); this is not Laya's per-question decision-head target format and
  has no consent/provenance gate. It was not run and is not a valid Laya
  training path.
- The public `divarofficial/real_estate_ads` release describes 1,000,000
  anonymized Divar property listings, six category-2 values, 16 category-3
  values, 421 cities, and structured neighborhood, price, size, deed, room, and
  amenity fields. The Hub marks it ODbL. The Dataset Viewer confirms that rows
  include `title` and `description` plus those structured fields. Complete
  row-by-row stream over the pinned 780,721,338-byte CSV yielded exactly
  1,000,000 data records and 60 columns, with no all-empty rows or row-width
  errors. The earlier 999,993/999,999 counters were not reproduced and are
  superseded by this pass. The current source has 999,946 non-empty titles,
  999,999 non-empty descriptions, 421 non-empty city slugs, two blank city
  values, and one row missing `cat3_slug`. The app mapping resolves 382 source
  city slugs to current app city slugs (925,664 rows); 74,336 rows have no
  mapped city. There are 1,188 distinct city/neighborhood pairs, of which
  1,120 have a unique exact city-scoped crosswalk; only 421,106 rows have an
  exact mapped city and neighborhood. The app location catalog contains 1,207
  distinct `cityId` scopes and 48,110 neighborhoods; those identifiers are
  not a one-to-one denominator for Divar city slugs.
- A full `cat2_slug × cat3_slug` cross-tab maps to 16 of the app's 18 property
  leaves: `apartment-sale` 303,385; `villa-sale` 121,753; `land-sale` 133,570;
  `apartment-rent` 211,880; `villa-rent` 64,678; `industrial-rent` 9,155;
  `office-rent` 21,418; `shop-rent` 45,993; `industrial-sale` 11,851;
  `office-sale` 5,155; `shop-sale` 21,855; `construction-partnership` 3,622;
  `pre-sale-services` 15,781; `suite-apartment-rent` 16,465;
  `villa-short-rent` 12,899; and `workspace-short-rent` 539. `land-rent` and
  `agency-services` have no source combination. These are raw source counts,
  not reviewed labels; conflicting, missing, or invalid records remain
  ineligible for their particular target. The crosswalk uses
  `residential-sell/{apartment-sell,house-villa-sell,plot-old}` for apartment,
  villa, and land sale; `residential-rent/{apartment-rent,house-villa-rent}`
  for apartment and villa rent; `commercial-sell`/`commercial-rent` with
  `shop-*`, `office-*`, or `industry-agriculture-business-*` for commercial
  leaves; `temporary-rent/{suite-apartment,villa,workspace}` for short-term
  leaves; and `real-estate-services/{presell,partnership}` for those two
  service leaves. `plot-old` does not appear under `residential-rent`.
- Structured-field completeness on the exact 1,000,000-record pass: title
  999,946; description 999,999; `building_size` 980,394 (98.0%);
  `rooms_count` 845,899 (84.6%); `land_size` 186,396 (18.6%);
  `neighborhood_slug` 437,139 (43.7%); `deed_type` 253,458 (25.3%);
  parking 728,156 (72.8%); elevator 541,749 (54.2%); and warehouse 728,155
  (72.8%). Price/rent/credit modes and amounts are separately sparse and
  cannot be collapsed to one budget field. Persian `rooms_count` is an enum
  (`یک`, `دو`, `سه`, etc.), not a number-only column. After the corpus
  normalizer, 3,576 duplicate text groups contain 7,465 rows (3,889 excess
  copies); near-duplicates are not included. A prior deterministic privacy
  scan flagged contact-like patterns, but it was not a comprehensive PII or
  rights review. No source text was printed by the census and no training was
  run.
- The user explicitly selected Divar as the source and real estate as the only
  current domain. Use the published `divarofficial/real_estate_ads` dataset
  rather than scraping the live site. ODbL grants database-level use subject to
  attribution/share-alike conditions, but does not settle independent rights in
  individual text content, including privacy/data protection; see the
  [dataset card](https://huggingface.co/datasets/divarofficial/real_estate_ads)
  and [ODbL 1.0 text](https://opendatacommons.org/licenses/odbl/1-0/). A full
  privacy/provenance audit and qualified review of downstream public use remain
  gates.
- The Divar fact normalizer was run locally against the pinned one-million-row
  source and wrote `data/divar/divar-property-offer-facts-v2.jsonl`: 999,416
  compatible rows after dropping conflicts/unsupported rows. It maps 16 of 18
  app property leaves and 382 app cities; 925,129 rows have an app-city map and
  420,989 have an exact city-scoped app-neighborhood ID. These are source
  coverage counts, not consent, legal clearance, or `/post` need labels. The
  12 converter tests pass; they cover category mapping, duplicate/conflict
  exclusion, contact-pattern redaction, and the invariant that listing
  price/area/amenities are not silently recast as seeker preferences.
- A local resumable Laya shadow pilot then selected 389 diverse rows from those
  999,416 records (covering 16 source categories and 382 mapped app cities) and
  made 182 batched calls to the exact
  `convaiinnovations/laya-multilingual` checkpoint. It used CPU for the first
  136 rows and Apple MPS for the remaining 253; model-reported inference time
  was 243.2 seconds total (120 MPS calls averaged 1.03 seconds per batch).
  The resulting 1.7 MB JSONL is explicitly `synthetic: true`,
  `derivedFromSupplyListing: true`, `isNeedGroundTruth: false`,
  `shadowOnly: true`, and `trainingEligible: false`. It is a pilot only, not a
  million-example training dataset.
- Pilot outputs remain too weak and mismatched to use as labels. `unknown`
  occurred on 85.5% of category-candidate answers, 57.8% of transaction-type
  answers, and 63.4% of property-kind answers. Against the available offer-side
  metadata, exact agreement among non-unknown predictions was 4/28 for category
  (14.3%), 28/159 for transaction type (17.6%), and 108/137 for property kind
  (78.8%). These are only proxy concordance figures, not model accuracy: source
  listings describe what a seller offers, while `/post` questions describe what
  a seeker wants. The category and transaction comparisons are especially
  perspective-sensitive. Deed, usage, parking, elevator, and storage have no
  sufficiently reviewed like-for-like gold labels in this pilot. In particular,
  seller-side amenity statements cannot be interpreted as user preferences.
- The pilot did not ask Laya to choose a city or neighborhood: the batch adapter
  supplies the source city as context and an empty neighborhood candidate list.
  Only 13/389 pilot records carry an exact mapped neighborhood ID, so this run
  cannot validate neighborhood extraction or claim complete location coverage.
  Location detection needs its own city-scoped alias/candidate evaluation against
  reviewed labels; it must not be inferred from Laya's other field scores.
- A Divar property ad remains **supply-side listing** evidence, not an
  authentic user need. Rewriting a seller/agent listing into first-person
  buyer/tenant language creates a derived/synthetic utterance, never real-demand
  ground truth. A defensible auxiliary task is to give Laya the original
  listing title/description and supervise only structured property attributes
  explicitly present in that record, with absent/conflicting facts unknown.
  That may improve property-fact extraction but cannot establish accuracy on
  natural buyer wording. Laya is a typed-decision model, not a text rewriter;
  do not add another model or count generated paraphrases as real needs.
- The local Laya worker environment is Python 3.12.10 with `laya` 0.3.20 and
  PyTorch 2.14.0. A permission-enabled probe in the same venv confirms MPS is
  built and available while CUDA is unavailable. Training has not started and
  peak Metal memory / full-training fit remain unmeasured.
  On 2026-09-25 the actual `/api/post/natural-analyze`
  route returned `ready` for `convaiinnovations/laya-multilingual` with a 1.23s
  local inference latency. This confirms the app-side inference path, not local
  fine-tuning capacity or production hardware.
- `npm run test:post-natural` passes the API contract, deterministic parser
  self-test, 56-case rules benchmark, and server-route self-test. The rules
  benchmark reports 100% on its checked-in fixtures except city recognition
  (53/54); neighborhood matching is 23/23. These are fixture results, not a
  representative real-user or Laya model-accuracy estimate. A separate local
  Python suite passes 4 batch-endpoint tests, the Divar normalizer suite passes
  12 tests, the corpus-eligibility suite passes 16 checks, TypeScript typecheck
  passes, and ESLint passes on the changed Laya/Post and batch-runner files.
- On 2026-09-26, the `/post` server analyzer was extended to recognize exact
  city names from all 1,207 neighborhood catalogs, instead of silently relying
  only on the shorter URL-city registry. An exhaustive exact-label probe
  resolved 1,207/1,207 catalog IDs when given the corresponding ID as context;
  24 labels occur in multiple catalogs and remain ambiguous without valid
  context. API regression cases verify locked Mashhad + joined
  `فرامرزعباسی` maps to the Mashhad neighborhood and centroid, locked Tehran +
  `ونک` maps to Vanak's own centroid, and `اندیشه` does not become Tehran.
  Rules, route, typecheck, lint, and neighborhood-disambiguation tests passed.

## Hard eligibility rule

A row may enter the training set only when all of these are independently
verifiable:

1. It is an authentic first-party user need with explicit, versioned consent
   for model training, or a source whose license explicitly permits this use.
   First-party rows carry a hash of the durable consent record; licensed rows
   carry row-level license ID/evidence and a manifest with attribution,
   share-alike, individual-content-rights, and downstream-use review evidence.
2. The exact source record is traceable by a non-reversible record hash; the
   user text and labels contain no unresolved PII.
3. Targets are confirmed by the user or a human reviewer. Prior-model output,
   templates, rule-generated text, and unreviewed labels do not qualify.
4. The typed question ID, allowed choice/unknown values, mapping version, and
   label provenance are recorded. Missing facts are labeled unknown, not false.
5. Exact and normalized duplicates are removed before split; near-duplicate
   groups stay in one split. Holdout data is human-labeled and never used for
   fitting or calibration leakage.
6. The row and manifest both declare the versioned target task
   `post-real-estate-need-intent/v1`; every row explicitly declares
   `synthetic: false`. Supply-side property listings and auxiliary listing-fact
   tasks cannot qualify as genuine `/post` need-intent training data.

`bun scripts/datasets/audit-laya-corpus.ts --input <corpus.jsonl> --manifest <manifest.json>`
performs a streaming, aggregate-only audit. It never prints source text or row
values and exits non-zero unless both per-row evidence and a qualifying
manifest are present. It also requires explicit per-row typed-decision targets
and the exact multilingual checkpoint in the manifest, the versioned need-intent
task, and an explicit non-synthetic marker on every row.

## Full structured-source rebuild and current v5 local run (2026-09-26)

Rebuilt a fresh, non-overwriting structured-facts artifact from the pinned CSV
using `scripts/datasets/divar_laya_corpus.py`:
`data/divar/divar-property-offer-facts-structured-v1-full-2026-09-26.jsonl`.
The manifest verifies the source SHA-256 and exactly 1,000,000 source rows.
It retains 999,416 compatible offer rows, 996,111 normalized text groups,
3,889 duplicate rows beyond the first, and rejects 583 category/city-conflict
rows plus one unmapped category. It records 944 contact-pattern redactions,
382/421 mapped source cities, 925,129 rows with an app city, and 420,989 rows
with an exact app-neighborhood mapping. This is still supply-side data;
`cloudTransferAllowed=false`, and individual-content/privacy review remains
open. The output adds seller-side `sourceOfferAttributes` v1 without copying
listing price, rent, or credit into seeker preferences.

The exact-checkpoint v5 smoke was rerun on this artifact: 32 rows, four batches
of eight, CPU, mean batch latency 8.864 seconds. Aggregate-only audit found
32/32 synthetic supply rows, 32/32 provenance records, zero PII-pattern
matches in the proposal text, and **0 qualified training rows**. Against
source-offer metadata (not seeker intent), Laya agreed on category for 7/13
answered decisions, property kind for 12/26, and transaction type for 2/11.
The deterministic round-trip was 100% only because those same source facts
created the hypothetical sentences; it is not independent accuracy evidence.

A new resumable full v5 run was started at
`data/divar/divar-property-offer-structured-v1-laya-counterfactual-v5-full-2026-09-26.jsonl`.
At the last recorded checkpoint it had processed 88 rows in 11 calls on the
exact multilingual checkpoint via the local CPU worker. This is an in-progress
proposal corpus, not a completed dataset. A linear estimate from the 32-row
smoke is about 12.8 days for the source ceiling; actual runtime can vary. The
runner skips repeated normalized-text groups and rejects contact-pattern
matches, so the eventual unique proposal count is expected to be below the
999,416 retained source-row count and cannot honestly satisfy a one-million
unique-clean-example claim. The interrupted v3-v6 artifacts were not resumed.

The installed environment reports `mps_available=false` and `cuda=false`; the
active inference worker reports CPU. The official Laya training notebook uses
a different checkpoint (`convaiinnovations/laya`) and two T4 GPUs, so it cannot
be run unchanged for the required multilingual checkpoint. The pinned
`laya==0.3.20` package exposes inference but no built-in `fit` API; its official
typed-decision RLCD-style training loop would need an explicit, tested adapter
for the multilingual model. Cloud training/data transfer is not an available
workaround under this source's local-only manifest. No fine-tuning has run and
no checkpoint has been written. Do not train from the weak Laya predictions or
claim synthetic proposals as verified seeker labels. See the
[official Laya repository](https://github.com/NandhaKishorM/laya) and its
[fine-tuning notebook](https://github.com/NandhaKishorM/laya/blob/main/notebooks/laya_finetune_typed_decisions_2xT4_kaggle.ipynb)
for the source training implementation.
`bun scripts/datasets/test_laya_corpus_eligibility.ts` checks the semantic and
source-use gates (16 checks pass). Licensed data may use a separate route from
first-party user consent, but the manifest must provide license, attribution,
share-alike, individual-content-rights, and downstream-use review evidence.
Divar-derived schema-v2 rows are explicitly marked
`divar-property-offer-facts/v2`, preserve real seller/agent offer perspective,
and carry `isNeedGroundTruth=false`; exact city-scoped neighborhood mappings
remain auxiliary offer facts, never `/post` seeker ground truth. These checks do
not make an unknown provenance claim true.

## Model/training compatibility

The official model card describes `laya-multilingual` as a 322M-parameter
mmBERT-base encoder with a 1,024-token default context. The public API uses
typed questions (`choice`, `noul`, `score`) with
`agent.predict(state, questions)`; it is not a free-form JSON generator. The
official fine-tuning notebook demonstrates the decision-head training recipe:
prepare one supervised target distribution per typed decision, use Laya's
`build_sequence`/`build_model` and `proper_reward`, train with RLCD plus soft
cross-entropy, fit temperatures, and save the Agent-compatible
config/weights/tokenizer/encoder layout. The current notebook loads 1,200
English benchmark cases (6,000 typed decisions), trains on two NVIDIA T4s,
reserves up to 400 decision items from the dataset's train split for
calibration, and evaluates on a separate 400-case/2,000-decision test split.
It starts from the *different* `convaiinnovations/laya` 421M checkpoint, not
`convaiinnovations/laya-multilingual`. It is a method reference, not proof that
its notebook fine-tunes the required multilingual checkpoint. Any adapter must
start from only `convaiinnovations/laya-multilingual`, retain its encoder and
tokenizer, and pass a load-and-predict check with the repository's pinned Laya
version.

The installed local package is `laya==0.3.20`; introspection confirms its
actual APIs are `load(model_id_or_path, device, subfolder, ...)`,
`build_sequence(tok, state, question, max_len, head_max_len, ...)`,
`build_model(cfg, encoder_dir, pretrained=...)`, and `proper_reward(...)`.
This makes a direct-checkpoint adapter technically feasible without the
router, but does not validate the official notebook's 421M-specific settings
against the multilingual weights. That requires a strict state-dict load,
checkpoint round-trip, and training/evaluation. A fresh offline probe on
2026-09-25 has now loaded the exact `convaiinnovations/laya-multilingual`
snapshot with `build_model` and `load_state_dict(strict=True)`: 170 tensors,
321,908,995 parameters, and no missing or unexpected keys.
`laya.load(local_snapshot, device="cpu")` also returned an `Agent`. This
establishes checkpoint/layout compatibility only; no gradient update, optimizer
step, calibrated export, or trained-checkpoint evaluation has run.

The current official typed-decision benchmark reports 0.352 accuracy for the
multilingual base versus a 0.461 majority-class baseline (2,000 decisions); the
0.766 result belongs to a separately fine-tuned checkpoint/workload. Thus
zero-shot success is not an acceptable substitute for this requested
fine-tuning. The official Kaggle notebook is a recipe reference only: it starts
from `convaiinnovations/laya` (421M ModernBERT) and its public benchmark data,
not `convaiinnovations/laya-multilingual` (322M mmBERT). Its model identifier,
encoder layout, tokenizer/config, and output artifact cannot be reused as-is
for the required target. A valid trainer must explicitly load the multilingual
checkpoint's own encoder/head/config and pass a strict `laya.load()` plus
typed-prediction round trip on the resulting artifact. Final evaluation must
use a held-out, human-confirmed Persian
corpus and report exact/macro accuracy, per-field precision/recall and
unknown/abstention quality, Brier/ECE calibration by question type and option
count, and option-order robustness. No such model benchmark is currently
available in this repository.

The upstream 51-language MASSIVE-intent evaluation explicitly includes Persian
(`fa`): `laya-multilingual` scored 0.390 on its 20-option task (100 examples
for that language in the 5,100-example sweep). This confirms Persian was tested,
but it is not evidence for Persian real-estate category/location accuracy; the
benchmark intent labels and text domain differ from `/post`. Treat it as a
language-capability baseline only, then compare the exact fine-tuned checkpoint
against Laya's own base predictions on a separately annotated property-need
test set. Source: [official 51-language benchmark](https://github.com/NandhaKishorM/laya/blob/main/BENCHMARKS.md#languages).

The official README warns that calibration samples come from the training
items; the current notebook code clarifies that it removes a random item-level
slice before gradient updates, then evaluates on the benchmark's test split.
The split does not group all questions from one source state together, so
similar/repeated states could cross the train/calibration boundary. Our trainer
must split by normalized-text/near-duplicate group before expanding records
into per-question decisions, keep calibration entirely out of gradient
updates, and keep a separate final test set. See the [official fine-tuning
guidance](https://github.com/NandhaKishorM/laya/blob/main/README.md#fine-tuning)
and [current notebook source](https://github.com/NandhaKishorM/laya/blob/main/notebooks/laya_finetune_typed_decisions_2xT4_kaggle.ipynb).

The current official README further states that `laya-multilingual` ships
without fitted temperature calibration (base ECE 0.314); its reported general
typed-decision accuracy is 0.352, below the 0.461 majority-class baseline.
An official diagnostic reports `action.act_probability` AUROC 0.30 and
`confidence` AUROC 0.77 on 396 decisions. These figures are not Persian `/post`
results, but they invalidate using action probability as an acceptance gate.
The local `/post` benchmark therefore measures raw argmax, coverage, abstention,
and confidence split by correctness; it does not derive a production threshold
from its 56-case development acceptance set. Explicit negative amenity examples
are labeled `no`, not `unknown`.

The live local worker was evaluated separately on the checked-in 56-case
Persian development set (2026-09-25, 56 successful sequential calls): raw
accuracy was transaction type 33.9% (n=56), property kind 58.8% (n=51),
parking 44.4% (n=9), elevator 50.0% (n=8), storage 60.0% (n=5), and category
candidate 100% (n=3). The three-case category result is not meaningful evidence
of generalization. Mean reported inference time was 273 ms and total wall time
16.1 s. A fresh rerun in this audit returned 272.2 ms mean inference and
16.18 s wall time with the same per-field results. This is a small development
acceptance set, not a representative or held-out evaluation; do not use it to
set thresholds. The active loopback worker reports the exact approved model and
`mps`; its executable is the project's Python 3.12 venv. A permission-enabled
probe in that same venv confirms `torch.backends.mps.is_available() == true`
and CUDA false. The sandbox-only probe reported MPS false and was not used as
hardware evidence. The worker process RSS was about 127 MB, which excludes
Metal allocations; model peak memory remains unmeasured.

A live route-level check with the two user-reported Persian location examples
returned HTTP 200 and `laya.status=ready` for the approved checkpoint, while
preserving the selected city and resolving both exact catalog IDs: Mashhad
`فرامرزعباسی` → `شهید-فرامرز-عباسی`, and Tehran `ونک` → `ونک`. Both responses
included finite catalog coordinates. The Mashhad response also reported a
Laya/rules transaction disagreement while keeping the deterministic value.
This proves the local API/resolver path for these exact inputs, not that the
browser form visibly applies the result or that broad real-world location
accuracy is high; a rendered click-through and representative held-out
evaluation remain outstanding.

The official benchmark also reports that overly large choice spaces perform
poorly (77 choices score 0.425 in its benchmark; the project recommends keeping
choices under about 20). Therefore neighborhood matching should remain
deterministic/catalog narrowing plus small candidate sets; this fine-tune must
not turn all 48,110 neighborhoods into one giant choice question. The app's 107
category leaves likewise require hierarchical decisions or shortlist candidates,
not one 107-way choice.

## Divar source decision

The user authorized Divar as the source; the selected route is its published
`divarofficial/real_estate_ads` release, not a crawler. Its ODbL marker is a
database-level use basis subject to attribution/share-alike obligations, not a
blanket grant over each text record's content/privacy rights. A complete
aggregate-only audit was streamed directly from the public CSV and did not
persist the raw file. The raw-to-app category crosswalk and city-key match are
now verified. A separate public-metadata-only neighborhood crosswalk maps
1,120/1,188 source city/neighborhood pairs uniquely to app catalogs across only
11 source cities; it reads no listing text and is not training data. The
6–7-row CSV/API discrepancy remains open. Before training, exclude/redact
flagged text, review source-field target semantics, and separately confirm
privacy/license obligations. Do not redistribute source text or publish a
derived dataset/model until that review. Ads can
support a separately named auxiliary listing-to-attributes experiment, never
authentic need ground truth.

## Current gate

**Not ready to train on the requested need-intake objective.** The audited local
inventory has 0 eligible rows and no first-party requests in PostgreSQL, much
less one million unique, real, consented, human-confirmed need examples. The
Divar one-million-row candidate is authentic property-listing data but is not
need-intake data; its full aggregate audit shows partial city/category/field
coverage and PII/contact signals that require per-record remediation. It also
brings ODbL obligations whose effect on a publicly deployed fine-tuned model
needs qualified review. The database table still has no consent columns. An
earlier permission-enabled probe reported MPS available, but the current
sandbox recheck finds MPS unavailable; CUDA is unavailable and peak
memory/full-training fit have not been measured. Do not silently relabel
listings, scrapes, synthetic rows,
AI-labeled rows, event telemetry, or unreviewed data as real need examples.

## Runtime recheck (2026-09-25 continuation)

Rechecking the project's `mini-services/laya-post/.venv` reports
`laya==0.3.20`, `torch==2.14.0`, MPS built but unavailable, and CUDA
unavailable. The approved checkpoint was then fetched from Hugging Face and
loaded locally as `convaiinnovations/laya-multilingual`; its model has
321,908,995 parameters, and the default Hugging Face cache now occupies about
1.36 GB under `~/.cache/huggingface/hub`. No user/listing text was sent to an
inference API. A private worker bound only to `127.0.0.1:8101` completed the
checked-in 56-case Persian Laya benchmark with zero request failures.

A later live recheck used the existing `mini-services/laya-post/.venv`
(Python 3.12.10, `laya==0.3.20`, `torch==2.14.0`) and cached snapshot revision
`e4e9ddf21a7b1903b7acffd8814ad4307bf63a67`. The strict state-dict load and
CPU `laya.load()` round-trip both passed. In this sandbox, MPS is built but
`torch.backends.mps.is_available()` is false, CUDA is false, and the host has
16 GiB physical memory; this does not establish that full fine-tuning fits or
provide a peak-training-memory measurement. The current health check to
`127.0.0.1:8101` fails with connection refused, so the earlier benchmark worker
is no longer running. No training was started.

The repeatable offline preflight is
`mini-services/laya-post/.venv/bin/python scripts/datasets/finetune/check_laya_multilingual.py`.
It pins the same snapshot and safetensors SHA-256, strict-loads the 170-tensor
state dict, and runs a two-field Persian smoke prediction via `laya.load()`.
This command passed locally; it explicitly reports that it neither trained nor
wrote a checkpoint.

Raw Laya argmax results on that development acceptance set:

| Field | Accuracy | Coverage | Wrong non-unknown |
| --- | ---: | ---: | ---: |
| Transaction type | 33.9% (19/56) | 78.6% | 28 |
| Property kind | 58.8% (30/51) | 80.4% | 12 |
| Parking | 44.4% (4/9) | 88.9% | 5 |
| Elevator | 50.0% (4/8) | 87.5% | 4 |
| Storage | 60.0% (3/5) | 80.0% | 2 |
| Category candidate | 100% (3/3) | 100% | 0 |

Category is only three scored cases and is not evidence of general accuracy.
The model also emitted confident unsupported amenity/deal predictions on
unmentioned information in targeted spot checks. This confirms that raw
confidence is not a safe auto-apply gate. The run is not held out or calibrated;
it must not be presented as a production accuracy estimate. The API-reported
mean inference latency was 431 ms/request across 56 requests, with a 24.8 s
wall-clock run. One direct warm CPU call measured 53 ms; timings vary by the
number of decisions and execution path. A Python process high-water mark was
about 2.6 GiB RSS (approximate, host-reported). No fine-tuning was attempted:
this host has neither CUDA nor available MPS, and the approved need-intent
corpus still has zero eligible records.

Official references: [checkpoint card](https://huggingface.co/convaiinnovations/laya-multilingual),
[Laya benchmark](https://github.com/NandhaKishorM/laya/blob/main/BENCHMARKS.md),
[official fine-tuning notebook](https://github.com/NandhaKishorM/laya/blob/main/notebooks/laya_finetune_typed_decisions_2xT4_kaggle.ipynb),
[Divar dataset card](https://huggingface.co/datasets/divarofficial/real_estate_ads),
[ODbL 1.0 text](https://opendatacommons.org/licenses/odbl/1-0/).

## Current-state revalidation (2026-09-25)

The source CSV still matches its pinned SHA-256
`e5760fe1325a195e6682c371457bfecd51d255c518756e3cbea234b8163a801f`.
The aggregate-only readiness gate was rerun against both local marketplace
JSONL files using their actual `*-manifest.json` filenames. The clean file has
408,790 well-formed, unique-text rows; the curated file has 383,495. Both
report zero missing text/labels, zero phone/email-pattern matches, and zero
eligible rows. In each file, every row lacks explicit synthetic status,
per-row source provenance, user-training consent or reviewed license evidence,
human label review, and Laya typed-decision targets. Both manifests lack a
versioned real-estate need-intent target and the required source-use attestations.
The aggregate audit sees 38 categories, 811 cities, and 18,129 neighborhoods in
each file, but those counts do not establish real-estate-only coverage or label
correctness. The current `clean-manifest.json` points to
`/Users/sasan/Downloads/smart_marketplace_500000.jsonl`; that source file is not
present in this workspace, and the manifest contains no source digest, so the
500,000-row input and its provenance cannot be reproduced or verified here.

A field-only pass over the clean corpus' assistant JSON found 37 non-missing
category labels, all belonging to service verticals (including plumbing,
vehicle repair, education, and cleaning); none of the app's real-estate leaves
appears. Thus its 811 cities and 18,129 neighborhoods are service-corpus
coverage, not real-estate coverage, and these 408,790 rows do not advance the
real-estate-first training target.

The project venv recheck reports `laya==0.3.20`, `torch==2.14.0`, CUDA
unavailable, and MPS unavailable in this execution environment. Docker-backed
PostgreSQL could not be rechecked in this turn because access to the local
Docker socket was denied; prior database counts are therefore historical, not
a fresh observation. No fine-tuning or full-corpus label generation was run.

## Manual-derived data and Laya recheck (2026-09-25)

Batch 04 adds seven individually inspected, manually authored hypothetical
Persian request states from source rows 159, 593, 666, 2773, 6743, 30890, and
673128. The review notebook verifies every source/group hash and derived ID,
all seven exact city-scoped location crosswalk entries, category/property/deal
mapping, six area values, three explicitly stated room counts, and the
synthetic/no-training guard. City/street wording disambiguates the Tehran
neighborhood in Bandar Anzali from Tehran city. Total batches 02–04 now contain
28 synthetic examples, all 16 Divar-mappable categories, 11 cities, and 24
unique exact city-neighborhood pairs. They still contain zero real needs and
zero examples eligible for either training objective.

The exact checkpoint was loaded with Hugging Face offline mode and evaluated
locally on CPU over the seven authored states. Raw argmax matched the synthetic
labels on category 5/7, property kind 5/7, transaction type 6/7, and usage
including unknown 3/7. Mean warm inference was about 168 ms per state and
startup/load about 4.4 s in this run. A wrong category/property decision on a
short-stay example had confidence around 0.96; outputs were not used as labels.
This is not an independent accuracy estimate and is further evidence that the
uncalibrated model must not self-label the corpus. No fine-tuning was attempted.

## Manual-derived batch 05 continuation (2026-09-25)

The local-only
[`batch 05 JSONL`](../data/divar/manual-derived-need-batch-05.jsonl) contains
20 individually inspected Divar offers reframed as hypothetical Persian seeker
utterances, with a [manifest](../data/divar/manual-derived-need-batch-05.manifest.json)
and a [lineage review notebook](../data/divar/manual-derived-need-batch-05-review.ipynb).
The states add 11 mapped app cities and nine exact city-scoped neighborhood
pairs. Their 20 source ordinals, normalized text-group hashes, derived IDs,
categories, city maps, and crosswalk IDs were verified against the pinned CSV
and the app location catalogs. Conflicting or ambiguous neighborhood text was
left at city level or excluded; budgets, payments, amenities, and seller
restrictions remain unknown rather than being converted into user preferences.

Across batches 02–05, the exploratory pilot now has 48 synthetic rows covering
all 16 Divar-mappable app real-estate leaves, 22 app cities, and 33 exact
city/neighborhood pairs. All 48 remain ineligible for both training objectives;
there are still zero authentic need-ground-truth rows. The full source contains
one million offers, but this manual pilot has inspected only 48 selected rows.

The exact multilingual checkpoint was loaded with Hugging Face offline mode on
CPU and run on the 20 batch-05 states. Raw synthetic-label agreement was 9/20
for category, 13/20 for property kind, 9/20 for transaction subtype, and 0/20
for usage including unknown. Mean warm latency was about 193 ms/state, p95 about
208 ms, and load about 3.5 seconds. This is not an independent accuracy
benchmark: both utterances and labels are synthetic. In particular, the usage
results and unsupported predictions confirm that the base model must not
self-label this corpus. The assistant authored each hypothetical state; Laya
only produced a separate typed-decision shadow result. No output changed any
label, and no fine-tuning was started. A separate one-question CPU probe had
about 2.56 GiB process high-water RSS (host process metric, not accelerator
peak-memory measurement). Individual-content-rights/privacy review and
downstream ODbL analysis remain open, so the artifacts stay local and are not
approved for training or redistribution.

## Manual-derived batch 06 continuation (2026-09-25)

The local-only
[`batch 06 JSONL`](../data/divar/manual-derived-need-batch-06.jsonl) contains
20 individually inspected Divar offers reframed as hypothetical Persian need
utterances. Its [manifest](../data/divar/manual-derived-need-batch-06.manifest.json)
and [review notebook](../data/divar/manual-derived-need-batch-06-review.ipynb)
record reproducible source lineage, city/category mapping, exact neighborhood
crosswalk checks, and exclusion gates. All 20 new city/neighborhood pairs are
unique relative to the earlier batches.

Across batches 02–06 there are 68 synthetic examples, 22 mapped cities, and 53
exact city/neighborhood pairs. They remain counterfactual seller-offer
transformations, not real seeker ground truth; none is eligible for real-need
or synthetic-auxiliary fine-tuning. Batch 06 was not scored by Laya; its
counterfactual utterances were generated by the conversational assistant and
are not valid Laya supervision. No fine-tuning was started. Independent human
review and source rights/privacy clearance remain prerequisites; see the
[corpus audit](divar-laya-derived-corpus-audit-2026-09-25.md).

## Current upstream method check (2026-09-25)

The current upstream README describes Laya as typed decisions (`choice`,
`score`, `noul`) rather than text generation. It reports the base
`laya-multilingual` checkpoint at 0.352 on its typed-decisions benchmark versus
0.461 for the per-question majority baseline, and notes that the shipped
multilingual checkpoint has no fitted temperatures. Its high-cardinality
choice analysis also warns that large option sets lose accuracy under the
default head-token budget. For this product, exact Persian amounts and
neighborhood matching stay deterministic; neighborhood candidates must be
narrowed before Laya sees a short list; and confidence thresholds must be
calibrated on a separate, authentic held-out set.

The upstream Kaggle notebook is a reference for preprocessing typed labels,
strictly loading weights, RLCD-style optimization, held-out calibration, and
evaluation. It is not a runnable trainer for the permitted checkpoint: the
notebook hardcodes `convaiinnovations/laya` (English/ModernBERT-large), trains
on `LocalLLaMA/typed-decisions`, and targets two Kaggle T4 GPUs. The required
`convaiinnovations/laya-multilingual` checkpoint is a distinct mmBERT-base
checkpoint. A project trainer must be adapted and shape-checked against that
exact model, retain group-disjoint train/calibration/test splits, and must not
upload the model or data by default. No training was started. Sources:
[upstream README](https://github.com/NandhaKishorM/laya) and [upstream notebook](https://github.com/NandhaKishorM/laya/blob/main/notebooks/laya_finetune_typed_decisions_2xT4_kaggle.ipynb).

## First-party data path and legacy synthetic corpus recheck (2026-09-25)

The 10,000-row `data/intake-human-marathon/run-2026-06-19T16-22-45/`
corpus is not observed user demand. Its run state says `useLlmCompose=false`;
all 10,000 rows are template-composed, the ten tone values are balanced at
1,000 rows each, and the expected category profile spans 22 categories (only
six of them real-estate leaves). A privacy-preserving normalized-text check
found only 22 distinct phrases: 9,978 rows (99.78%) duplicate another row.
The fixture resolves to only nine distinct cities and 16 distinct
neighborhoods. The recorded parser run reports 10,000/10,000 passing, with
city and neighborhood resolved for all 10,000 and no AI invoked.
Those are closed-loop fixture outcomes: text, category, city and neighborhood
were composed from the same test profile. They cannot establish generalization
or count as authentic/user-ground-truth examples. The composer source has an
optional local chat-completion path, but it was disabled for this run.

The current publish-to-training path has a separate collection gap. The only
production caller, `src/app/api/need-intake/publish/route.ts`, invokes
`captureTrainingExampleAsync` without `trainingConsent`; the capture function
returns `null` unless consent contains a nonempty actor and policy version plus
a valid grant timestamp, and the consent self-test verifies that absent or
malformed consent is skipped. Therefore successful publishes through this
caller do not populate the first-party training table. The consent object is
also included in the captured JSON trace, so a future fix must not persist a
raw account identifier in training exports. The current `IntakeTrainingExample`
table has no dedicated consent-evidence columns, and export selection filters
on `reviewed` but does not independently enforce source consent/provenance.

This is a high-priority path to genuine real-estate need examples, but it needs
an explicit user-facing opt-in, versioned policy text, server-authenticated
grant evidence, privacy-safe audit storage, and an export eligibility filter
before collection is enabled. No such collection or database change was made
in this audit. Until then, Divar-derived rows remain offer facts or explicitly
counterfactual synthetic examples—not real demand—and cannot be promoted to
first-party training labels.

Read-only verification in this turn: `bun scripts/datasets/test_laya_corpus_eligibility.ts`
passed 16 checks; `python3 -m unittest scripts.datasets.test_divar_laya_corpus`
passed 12 tests; and the existing training-consent guard self-test passed. The
new audit notebook's source cells were executed sequentially with Python and
reconciled to the aggregates above. Jupyter/nbconvert is not installed in the
available Python runtimes (`No module named jupyter`), so the notebook kernel
render/output embedding could not be validated here. No model training,
corpus-wide labeling, database access, or user-data capture was attempted.

## Local Divar counterfactual batch and schema-aware audit (2026-09-26)

The user authorized a local, resumable batch using the exact
`convaiinnovations/laya-multilingual` checkpoint, with every derived output
separately marked hypothetical/proposal. The active CPU run reads the pinned
999,416-row normalized Divar offer corpus and writes
`data/divar/divar-hypothetical-needs-laya-full-v4-2026-09-26.jsonl`; it is
not a collection of authentic user needs. The source manifest prohibits cloud
transfer. No model training has started.

At 2026-09-26 01:04 UTC, the runner manifest reported 19,328 processed rows of
999,416 source rows, 2,883 inference calls, 117,085,870 output bytes, and zero
invalid-proposal, contact-pattern, or truncated-state skips. The exact model is
recorded and the device is CPU; the installed PyTorch reports MPS built but not
available and CUDA unavailable. Wall throughput since start is roughly 1.6
rows/second, so a full pass is expected to take several days if throughput
holds. This is a live progress snapshot, not completion evidence.

The previous corpus auditor incorrectly treated this nested schema as missing
text and labels. `scripts/datasets/laya-corpus-audit-shape.ts` now reads the
synthetic `state`, `hypotheticalNeed.targetDecisions`, exact city/neighborhood
targets, and hashed source lineage for aggregate auditing. The structural
reader is covered by `test_laya_corpus_audit_shape.ts`; the separate eligibility
gate remains fail-closed. At an audit snapshot of 19,328 rows, 0 had missing
text/targets, malformed JSON, or regex-detected phone/email; all 19,328 had
source lineage and typed counterfactual targets, and all were still marked
synthetic and supply-side. Training-eligible rows remained 0. The snapshot
covered 16 categories, 346 city slugs, and 817 neighborhood IDs. It found
2,580 normalized duplicate-text rows (2,357 with matching targets) and 223
rows in 156 text groups whose target values conflict. These duplicates/conflicts
require deduplication or quarantine before any model-fit experiment; no majority
label is inferred.

The batch's target decisions are derived from seller/agent listing facts, while
Laya's `answers` remain unreviewed predictions. Neither is authentic seeker
ground truth. The resulting corpus is useful for a separately tracked
counterfactual/weak-supervision experiment only after rights review, conflict
quarantine, group-disjoint holdout design, and explicit approval of that
training objective. It cannot meet the real-need objective merely by reaching
one million rows. In particular, this source maps only 16 of 18 app property
leaves; current observed city/neighborhood coverage is far below the app
catalog (1,207 cities / 48,110 neighborhoods). No missing real examples are
fabricated or counted as source-derived facts.

The new aggregate audit emitted no record text or label values. Its structural
reader tests passed (10 assertions) and the semantic eligibility tests passed
(18 assertions); the live audit correctly exited non-zero because the corpus
is synthetic, supply-side, contains duplicate/conflicting text, and lacks the
rights/review attestations required by the real-need training gate.

An additional audit snapshot at 19,328 rows compared the unreviewed Laya choices
with the counterfactual source-derived targets solely as a proxy diagnostic:
category candidate 15,058/16,957 answered choices agreed (88.80%); property kind
12,509/15,285 (81.84%); transaction type 6,847/18,303 (37.41%); deed type
2,050/3,015 (67.99%); parking 2,660/3,447 (77.17%); elevator 1,363/1,611
(84.61%); and storage 1,668/1,953 (85.41%). Coverage was not 100% for all
fields. These are not accuracy estimates: generated utterances and labels share
the same source facts/template, and seller-offer facts are not user preferences.
The low transaction agreement is a concrete warning against using the base
checkpoint's output as labels or auto-applying it. City and neighborhood are
deliberately not decided by Laya in this batch; they remain deterministic
crosswalk context, not model-scored outcomes. The model card's uncalibrated
probabilities also remain unsuitable as acceptance thresholds.

The follow-up `finalize-divar-counterfactual-corpus.ts` is implemented but
intentionally has not run on the live corpus. It refuses non-complete or
non-`--all` manifests, mismatched bytes/row accounting, wrong model/task,
schema errors, PII-pattern matches, or output overwrites. Once the batch
finishes, it will preserve one row for each unique normalized prompt with a
consistent target, quarantine every row in a prompt group with conflicting
targets, and write a manifest that still declares the corpus synthetic and
ineligible for training. Its integration fixture covers successful collapse,
full conflict quarantine, retained ineligibility, and rejection of a running
batch. The 10 schema-reader checks, 9 dedup checks, 18 eligibility checks, and
9 finalizer integration checks pass; TypeScript and targeted ESLint pass.

I attempted a fresh read-only check for the app's first-party training source,
but Docker reports that its daemon is not running in this environment, and
`pg_isready` is unavailable. Therefore the zero-need/zero-reviewed-example
database counts above are historical (2026-09-25), not re-verified for this
turn; no database rows were read or changed.

Live progress refresh at 2026-09-26 01:12 UTC: the approved batch is still
running, with 20,128/999,416 rows processed, 3,008 batched inference calls, and
121,925,902 output bytes. Since its 2026-09-25 21:41 UTC start, the observed
throughput is about 1.6 rows/second (roughly seven days for a full pass if that
rate holds). The latest manifest has 16 categories and 351 mapped city slugs.
The concurrent read-only corpus audit at 20,000 rows found no malformed JSON,
missing text/targets, or regex phone/email patterns; 20,000/20,000 rows remain
synthetic, supply-side, source-provenanced counterfactuals, and 0 qualify for
real-need training. It found 2,723 normalized duplicate-text rows, including
233 rows in 161 conflicting-target groups. Laya/source-target proxy agreement
for transaction type was 7,072/18,938 answered predictions (37.34%); this is
not accuracy, but is an additional warning that the offer-to-need conversion
and model output are not safe training labels. No process restart, new source
transfer, training, or database change was performed.

The same process continued without restart; its latest live manifest snapshot
at 2026-09-26 01:14:48 UTC is 20,416/999,416 rows, 3,047 inference calls,
and 123,656,354 output bytes, still on CPU.

## Root-cause check: Laya decision mismatches (2026-09-26)

The 20,000-row transaction-type proxy check was not caused by batch-order
corruption. The installed `laya==0.3.20` `Agent.predict_batch` implementation
documents and returns results in input order; the local worker returns its
result array unchanged, and the TypeScript batch runner pairs each result with
the corresponding group element by index. A sanitized proposal that explicitly
says `برای خرید آپارتمان` has source-derived expected value `buy`, while the
base multilingual checkpoint selected `rent_rahn_full` with answer probability
0.4008. The prompt is unambiguous; this is evidence of a zero-shot decision
quality failure, not an alignment bug. Do not treat the checkpoint's argmax as
a target or auto-apply it without calibrated, independently measured gates.

The upstream Laya README now reports its base `laya-multilingual` typed-decision
benchmark at 0.342 accuracy against a 0.461 per-question majority baseline;
the 0.766 figure belongs to a different, fine-tuned checkpoint/workload. The
official fine-tuning notebook starts from `convaiinnovations/laya` (421M,
ModernBERT), not this project's required `convaiinnovations/laya-multilingual`
(322M, mmBERT). It therefore cannot be run unchanged; the custom trainer must
strictly load the exact multilingual weights, preserve Laya's typed-decision
sequence/reward contract, calibrate on held-out reviewed Persian examples, and
report category- and city-disjoint test metrics before any deployment.
Official references: [Laya README](https://github.com/NandhaKishorM/laya/blob/main/README.md),
[fine-tuning notebook](https://github.com/NandhaKishorM/laya/blob/main/notebooks/laya_finetune_typed_decisions_2xT4_kaggle.ipynb).

## Fresh structural audit and evaluation caveats (2026-09-26)

At the 23,040-row structural-audit snapshot, the corpus had 0 malformed JSON
rows, 0 missing texts, 0 missing targets, and 0 matches for the phone/email
patterns checked. These checks do not establish complete PII removal. All
23,040 rows were still explicitly synthetic and supply-side, with no consent,
license, or human-review metadata; qualified/training-eligible rows remained
0. There were 3,376 normalized duplicate-text rows (14.65%), including 289
rows in 199 conflicting-target groups. Snapshot coverage was 16 categories,
353 cities, and 835 neighborhood IDs. The source contains at most 999,416
normalized records, so a one-to-one pass cannot produce one million rows even
before deduplication; it also does not cover the full app geography/category
catalog.

This audit found and fixed a blind spot in its own proxy metrics: it previously
skipped predictions whenever the counterfactual target was unknown, hiding
false proposals. It now reads Laya's `choice`/`noul`/`value` primitives
consistently with the dedicated evaluator and reports false proposals on
unknown-target rows. In the 23,040-row snapshot, Laya proposed a transaction
type for 368/446 unknown-target cases (82.51%), and a usage value for
3,971/23,040 unknown-target cases (17.24%). This is counterfactual prompt
diagnostics, not false-positive rate on real users. Audit shape/eligibility
tests (14 and 18 assertions), ESLint for the changed audit files, and full
TypeScript no-emit check pass. The fail-closed corpus audit intentionally exits
non-zero because its inputs are synthetic, unlicensed/unconsented, unreviewed,
duplicate/conflicting supply-side examples.

The separate evaluator snapshot read 22,848 rows. Overall exact proxy agreement
was 77.77% for category candidate, 66.15% for property kind, and 35.43% for
transaction type; missing or unknown predictions count as non-matches in these
rates. Among the 444 unknown transaction targets, 82.66% received a model
proposal. These rates are not independent accuracy estimates. The city
resolver consistency check was 85.61% exact when compared with the catalog city
label inserted into the generated template. The neighborhood resolver chose
the exact city-scoped crosswalk target in 9,614/9,614 generated cases (918
unique city/neighborhood pairs); because the target name was copied into the
template, this is not evidence of free-form user-text extraction accuracy.

Live batch refresh at 2026-09-26 01:48 UTC: 23,776/999,416 source rows
processed, with 3,563 Laya inference calls; process remains active, local, and
CPU-bound. Throughput is around 1.6 rows/second, so full completion remains
approximately a week away if the rate holds. Do not train on this output.

The latest separate evaluator snapshot (23,456 rows) remains consistent with
the earlier diagnosis: exact proxy agreement was 77.65% for category candidate,
66.11% for property kind, and 35.43% for transaction type; 82.78% of the 453
unknown transaction targets still received a proposal. The deterministic
neighborhood resolver returned the crosswalk-inserted target in 9,861/9,861
cases across 924 city/neighborhood pairs. This only verifies resolver
consistency after exact-name injection, not the user's free-form recognition
problem. The `/post` natural-language rules self-test still passes.

## Fresh source, rights, and first-party capture check (2026-09-26)

The local source manifest says the normalization read 1,000,000 source rows,
kept 999,416 offer rows, and has 996,111 normalized text groups. Thus even a
perfect one-output-per-offer pass cannot create one million clean unique
examples from this source. It maps 382 of 421 source cities into the app; only
420,989/999,416 rows have a mapped app neighborhood. Those figures are
offer-data coverage, not observed need coverage, and do not cover all app
cities/categories/neighborhoods. The official dataset card currently declares
ODbL and describes one million ads; the local manifest also keeps cloud
transfer disabled and requires review before redistribution. The official
ODbL text notes that individual contents may still carry separate copyright,
privacy, data-protection, or personality rights; ODbL labeling alone does not
clear those. Whether this specific derivative/trained model can be publicly
used needs an actual rights review, not an assumption. Sources: [Divar dataset
card](https://huggingface.co/datasets/divarofficial/real_estate_ads) and
[official ODbL 1.0 terms](https://opendatacommons.org/licenses/odbl/1-0/).

The current local DB could not be freshly counted: Docker reports that its
daemon is not running, and there is no local listener on the default PostgreSQL
port. The zero-request/zero-training-record census in this report is therefore
historical (2026-09-25), not a current database fact. The source code still
shows that `/api/need-intake/publish` invokes training capture without a consent
object, while `captureTrainingExample` skips when consent is absent. There is
no model-training consent field on `User` or `IntakeTrainingExample`, and no
model-training consent language found in the searched app/docs. The guard only
checks the shape of a passed object, not a durable consent record; do not wire
client booleans into it. Enabling a first-party training collection therefore
needs a reviewed opt-in policy, auditable consent record, actor binding,
withdrawal/deletion handling, and retention decision first. The existing
consent guard self-test passes without DB writes.

Fresh audits at 2026-09-26 01:56 UTC: 24,448 rows passed structural checks
(zero malformed/missing text/targets or phone/email-pattern matches), but
3,696 normalized text duplicates and 330 conflicting rows in 228 groups were
found. All rows remain synthetic and supply-side; qualified rows remain zero.
The separate 24,480-row evaluator still reports 35.44% transaction exact
agreement and 82.35% model proposals for unknown transaction targets. The
neighborhood exact-name resolver passed 10,307/10,307 crosswalk-injected cases
across 930 city/neighborhood pairs; this is not free-form extraction accuracy.

Latest live process manifest at 2026-09-26 02:00 UTC: 24,896/999,416 processed,
3,723 inference calls, local loopback Laya, CPU; 0 contact-pattern, invalid-
proposal, or truncated-state skips so far. Still running. Training has not
started.

## App-catalog coverage reconciliation (2026-09-26)

The reproducible aggregate-only check in `scripts/datasets/audit-divar-app-coverage.ts`
compares the retained Divar offer corpus with the actual `/post` runtime
catalogs. It finds 18 app real-estate leaves versus 16 source category leaves;
`agency-services` and `land-rent` have no source category. The runtime catalogs
contain 1,207 valid city catalogs and 48,110 neighborhoods. The 421 source
cities map to 382 app cities (90.74% of source city slugs, but only 31.65% of
app city catalogs); 925,129/999,416 retained offers have a mapped city. The
exact city-scoped neighborhood crosswalk matches 1,120/1,188 source pairs
(94.28%), while only 420,989/999,416 retained offers have a mapped
neighborhood (42.12%). Thus pair-level coverage must not be mistaken for
row-level coverage or broad `/post` geography coverage.

The raw crosswalk counts 421,106 source CSV rows with an exact app-neighborhood
match, versus 420,989 mapped rows in the retained normalized corpus: a delta of
117. The corpus normalizer excluded 584 source rows (583 conflicting groups,
zero missing text, and one unmapped category), so the delta is bounded by those
exclusions. The available aggregate manifests do not cross-tab the 117 rows by
skip reason; do not claim a more precise reconciliation. The coverage audit
now reports this denominator difference and explicitly marks row-level
attribution unavailable. It does not read or emit listing text.

At 2026-09-26 02:11 UTC, the locally running hypothetical conversion had
processed 26,048/999,416 rows in 3,894 Laya calls. It runs the exact
`convaiinnovations/laya-multilingual` checkpoint over loopback on CPU. These
outputs are explicitly proposal-only, synthetic counterfactuals derived from
seller offers—not real user needs, reviewed labels, or training data. Fine-
tuning remains unstarted, and source rights/privacy review remains an open gate.

The 26,048-row evaluator snapshot reported proxy exact agreement of 77.81% for
category, 66.15% for property kind, and 35.47% for transaction type. Among
unknown-target rows, the model still proposed a transaction in 408/497 cases
(82.09%), and proposed a usage in 4,533/26,048 cases (17.40%). These are
synthetic source-offer counterfactual comparisons, not independent accuracy or
real-user false-positive estimates, but they show that unknown transaction and
usage values must not be promoted to labels. The deterministic city check was
85.59% against city names inserted into generated templates; the neighborhood
check was 10,950/10,950 because the exact crosswalk target was inserted into
those templates. Neither location number tests free-form user recognition.
Training-eligible rows remain 0; the structural audit intentionally fails
closed on this proposal-only corpus.

## Official Laya fine-tuning path and checkpoint compatibility (2026-09-26)

The current official Laya README describes typed-decision fine-tuning as
specialization on domain decisions, not text generation. Its linked Kaggle
notebook is not a ready-made recipe for the required checkpoint: the notebook
sets `MODEL_ID = "convaiinnovations/laya"` (English, 421M parameters) and uses
the LocalLLaMA typed-decisions benchmark. It preprocesses state/question/gold
probability distributions into Laya's marker sequences, then trains with the
RLCD/proper-scoring objective and a soft cross-entropy term, with a held-out
calibration slice. The README's 0.766 benchmark result belongs to the separate
fine-tuned typed-decisions checkpoint; on the same benchmark it reports
0.352 for the multilingual base, below the 0.461 majority baseline. Those
results are not evidence for this real-estate task. Sources: [official Laya
README](https://github.com/NandhaKishorM/laya/blob/main/README.md), [official
fine-tuning notebook](https://github.com/NandhaKishorM/laya/blob/main/notebooks/laya_finetune_typed_decisions_2xT4_kaggle.ipynb),
and [official benchmark table](https://github.com/NandhaKishorM/laya/blob/main/BENCHMARKS.md).

The repository's local compatibility preflight pins the exact approved
multilingual snapshot (`e4e9ddf21a7b1903b7acffd8814ad4307bf63a67`) and model
weight hash, checks strict state-dict loading and the multilingual encoder,
and optionally runs a local smoke prediction. This is useful for proving that
an eventual derivative starts from the right checkpoint; it is not a training
recipe or evidence of a trained derivative. No fine-tuning has started: the
current Divar/Laya proposals have no independent human-verified need labels,
and Laya pseudo-labels cannot serve as independent ground truth for training
the same model without turning the exercise into unvalidated self-distillation.

## Current run and first-party data gate (2026-09-26 02:25 UTC)

The live local batch is at 27,360/999,416 normalized offers with 4,084
inference calls; the active worker health check reports the exact approved
checkpoint loaded on CPU. Three duplicate-text groups have been skipped so
far, with no contact-pattern, invalid-proposal, or truncated-state skips. At
the observed rate, completion is still on the order of several days. This is
only a hypothetical proposal artifact and cannot satisfy the 1,000,000
real-need training-data requirement.

The Docker daemon was unavailable during this turn and no local listener was
found on PostgreSQL's default port, so no current database row count is
asserted. The schema has no durable training-consent record, and the publish
route still calls training capture without consent evidence; the capture
function therefore fails closed for that caller. Any real-user corpus path
needs a separately approved, auditable opt-in and withdrawal/retention policy
before capture is enabled.

## Authorized local proposal batch and quality snapshot (2026-09-26 02:41 UTC)

The user explicitly approved local, batched inference with Laya to turn Divar
property offers into separately marked hypothetical proposals. This authorizes
neither treating the result as observed user demand nor training, redistribution,
or additional scraping. The active run remains local and uses only
`convaiinnovations/laya-multilingual` on CPU.

At 02:41 UTC the committed manifest checkpoint was 29,024 of 999,416 normalized
offers, 4,325 inference calls, four duplicate text groups skipped, and zero
contact-pattern or invalid-template skips. A byte-bounded read of exactly the
manifest's committed output found 29,024 rows, zero broken synthetic/ineligible
flags, no repeated source IDs or normalized-text groups, 358 mapped city slugs,
and 16 real-estate category leaves. Of those proposal rows, 12,215 (42.09%)
carry an exact source-crosswalk neighborhood; this is inherited mapping coverage,
not neighborhood recognition accuracy. The normalized source contains 996,111
unique text groups, so deduplication alone leaves it 3,889 short of a million
unique examples before any further quality exclusions.

The shadow model outputs are not reliable labels. On the same hypothetical
rows, agreement with source-derived targets was 77.77% for category and 66.10%
for property kind; transaction agreement was 35.30%, and 81.62% of unknown
transaction targets still received a non-unknown proposal. These are
counterfactual/source-proxy comparisons, not user-need accuracy. There is also
category-label leakage in this runner's candidate construction: its Laya
category options are narrowed using the source-derived target category. Thus
the 77.77% category agreement is target-conditioned and must not be cited as
independent model performance. The category proposals need a target-independent
question set before even proxy benchmarking.

The full-corpus audit still shows 16 of 18 app real-estate category leaves,
382 of 1,207 app city catalogs represented, and only 420,989/999,416 rows
(42.12%) with an exact app-neighborhood mapping. Therefore this source cannot
meet the requested complete city/category/neighborhood coverage by itself.
The locally measured throughput is about 1.6 rows/second; completing the
remaining source rows at this rate is roughly seven days. Any acceleration or
second source must preserve the same explicit synthetic/proposal-only contract.

The latest official Laya benchmark further cautions that its base multilingual
checkpoint scored 0.352 on a broad typed-decision benchmark against a 0.461
majority baseline; those are not Persian-real-estate measurements, but they
make zero-shot outputs unsuitable as ground truth. The user-authorized proposal
corpus remains useful as a clearly labeled shadow artifact and pipeline test,
not as the supervised fine-tuning corpus. No fine-tuning has started.

The reproducible snapshot notebook at
`docs/divar-laya-live-snapshot-audit-2026-09-26.ipynb` was added and its code
cells were executed top-to-bottom with the bundled Python interpreter against
the live manifest's committed byte boundary. At 02:44:28 UTC it reconciled
29,312 rows exactly, found zero broken synthetic flags or duplicate IDs/groups,
92.58% mapped city rows, 42.09% exact source-crosswalk neighborhood rows, and
the same category/transaction proxy behavior. The notebook runtime packages
`nbformat`, `nbclient`, and `ipykernel` are unavailable, so this validates the
notebook JSON and executes its code as a script but does not produce saved
notebook cell outputs or a rendered notebook preview.

The still-running batch advanced to 29,664/999,416 normalized source rows and
4,422 inference calls by 02:47:52 UTC. No model training or database write was
performed.

## Target-independent Divar/Laya batch revision (2026-09-26 03:27 UTC)

The user approved a local Laya batch whose Divar-derived outputs remain separate
and explicitly hypothetical/proposal-only. The earlier v4 run was stopped at its
last committed checkpoint (31,712 rows, 4,732 calls) after confirming category
label leakage: source target category had narrowed Laya's options. The v4 JSONL
is preserved, its manifest now says `interrupted`, and it is not a final corpus.

Runner v5 fixes that leakage for hypothetical examples. Every row now uses the
same exact question schema, recorded in the run manifest and hashed in each
result. The category question always includes all 18 real-estate leaf categories
from the app plus `unknown` (19 choices); the option set is not derived from the
row's target. The seven other typed questions remain in the same Laya call.
This is within the official checkpoint guidance to keep a `choice` question
below roughly 20 choices. The exact approved checkpoint is loaded once by the
private loopback worker and reused on Apple MPS. No cloud inference or other
model is used.

A 32-row v5 smoke completed in one batch (13.8 seconds reported Laya latency;
207,751 bytes). A deliberately diverse 389-row sample covered 16 source/app
property leaves and 382 mapped app-city slugs, completed in 13 batches with
173.9 seconds total model-reported latency, and emitted 2,423,865 bytes. It is
still a proxy diagnostic, not a representative user test. Agreement with the
source-derived counterfactual targets was 23/389 (5.91%) for leaf category,
83/389 (21.34%) for transaction type, and 198/389 (50.90%) for property kind.
The high exact rates for deed and amenities mostly reflect `unknown` targets;
they do not establish preference recognition. Zero rows are training-eligible.
These results reject using zero-shot Laya answers as labels and do not establish
real-user accuracy.

## /post neighborhood resolver false-auto audit (2026-09-26 04:33 UTC)

The first exhaustive catalog consistency run exposed 881 wrong unique neighborhood
auto-hits among 48,110 catalog rows (1.83%). Most were caused by words inside a
selected compound/qualified city being matched as neighborhoods; a smaller set
came from a generic «ملک می‌خواهم» tail being accepted as a location cue. The
shared text resolver now masks selected-city spans, retains full canonical
labels when a separate city mention supports them, bounds cue matching at the
city boundary, and does not treat «می‌خواهم» as a location cue. Fragment
fallback only auto-applies when an explicit spatial cue remains.

The final full-catalog audit tested all 48,110 unique city-scoped rows in 1,207
catalogs with three deterministic Persian phrase forms. It found zero malformed
rows, duplicate scoped IDs, wrong unique auto-hits, or ambiguous candidate sets
missing the expected catalog row. Exact top-one resolution was 47,187/48,110
(98.08%); the expected row appeared in 271 additional review-only ambiguous
candidate sets, for 98.64% candidate recall. 652 rows remained unresolved and
624 test phrases produced no extractor fragment. These are generated
catalog-consistency cases, not real-user recognition accuracy; city-as-own-
neighborhood and duplicate city-component cases are intentionally left blank.

Regression checks passed for the selected-city row, «بوئین و میاندشت» component
collisions, generic location tails, two-character «رج» under an explicit cue,
Vanak, Ferdowsi, and joined «فرامرزعباسی». Post-intake, location-priority, and
neighborhood-disambiguation self-tests passed; targeted ESLint and root
TypeScript checks passed. The full audit is reproducible with
`bun scripts/datasets/audit-post-neighborhood-catalog.ts`.

The full local Laya v5 run remains active and proposal-only. At 04:33 UTC it had
processed 3,584/999,416 normalized source rows in 112 inference batches on MPS;
no training or database writes have occurred. At the observed 0.90 rows/second,
full processing is roughly 13 days, not a short smoke-test operation. The
normalized source has 996,111 unique text groups before later filtering, so it
cannot produce one million unique source-backed rows by itself.

Location QA distinguishes two different implementations. The older standalone
deterministic extractor's 397-city registry recognized 217/388 (55.93%) of the
generated city labels in this sample. The actual `/post` server resolver scans
the full 1,207-catalog city index and matched all 388/388 (100%) when supplied
the correct city context. This is only a wiring/alias consistency check because
the generated text contains the catalog city name. It is not user-text
recognition accuracy. The source-wide 420,989/999,416 exact city-neighborhood
crosswalk rate remains about 42.12%, so many source offers cannot seed an app
neighborhood. On the 13 exact-crosswalk rows in the diverse sample, all 13
neighborhood resolver outputs matched their inserted catalog targets; likewise
not an independent accuracy estimate.

The corrected all-rows v5 batch is now running locally with `selection: all`,
`batchSize: 32`, the same fixed question schema, and the exact multilingual
checkpoint. At the 03:27 UTC snapshot it had committed 160/999,416 normalized
source rows, five inference calls, MPS, and no skips. Current throughput implies
several days for the full scan; this early estimate is provisional. The
normalized source has 3,541 repeated text groups at full-file scan, so even
before later template collisions or quarantine, it cannot yield 1,000,000
unique source groups. The full corpus finalizer correctly refuses pilots and
will run only after the full manifest completes.

This batch does not authorize promoting any row to genuine user demand, public
redistribution, or supervised training. The generated deterministic need text
and all model proposals retain `synthetic: true`, `realNeedGroundTruth: false`,
and `trainingEligible: false`. No fine-tuning has started. Current source
coverage and zero-shot results remain insufficient to claim the requested
complete-city/category/neighborhood coverage or high-accuracy model.

## Active v5 checkpoint integrity audit (2026-09-26 04:56 UTC)

At the manifest's committed 4,416-row checkpoint, an aggregate-only audit parsed
all committed JSONL records with no malformed row. All 4,416 retained the
synthetic/counterfactual, non-ground-truth, shadow-only, not-training-eligible,
not-approved, and redistribution-disallowed flags; every row recorded the
exact `convaiinnovations/laya-multilingual` checkpoint on MPS. No duplicate
source IDs or normalized source-text groups appeared in this prefix, and all
Laya choice outputs were within their question's declared option schema.

The deterministic counterfactual targets matched their source category,
property-kind, transaction, mapped city, and city-scoped neighborhood facts on
all 4,416 checked rows. Usage and seeker budget/rent/deposit targets remained
unknown on every row; none of the generated states contained a numeric
currency-unit amount. This checks source/transform invariants only—it does not
validate Laya's predictions as correct seeker labels.

This early source-order prefix contains 16 app property leaves, 267 mapped app
city slugs plus 334 unmapped rows, and 1,840 exact neighborhood crosswalks
(2,505 source rows do not state a neighborhood; 71 remain unresolved). These
prefix counts are not a representative sample or full-corpus coverage result.
The manifest reports 138 batches averaging 38.6 seconds of model-reported
inference per 32-row batch on MPS; a linear model-time extrapolation is about
14 days for all 999,416 normalized source rows, before other pipeline overhead.
The full batch remains active, and fine-tuning has not started.

## Bounded v5 decision-quality audit (2026-09-26)

The evaluator now accepts `--max-rows` so it can inspect exactly the committed
prefix of an append-only live run without reading a partially written tail. It
was run with the manifest's committed count of 4,800 rows. This is a source-order
prefix, not a random or city-balanced sample; all rates below are therefore
diagnostic only. The targets are deterministic counterfactuals derived from
seller/agent offers, not verified preferences or genuine user requests. None
of these comparisons is real-user model accuracy, and the corpus still has zero
training-eligible rows.

The largest failure is category collapse. Laya's exact agreement with the
counterfactual category target was 839/4,800 (17.48%). It predicted
`apartment-rent` for 3,841/4,800 rows (80.02%); among `apartment-sale` targets,
1,346/1,468 (91.69%) were labeled `apartment-rent`. It also mapped 444/545
`villa-sale` and 427/645 `land-sale` targets to `apartment-rent`. The category
question offered the full property-leaf catalog plus `unknown`, so this is not
explained by a missing target option. In this measured path, category is not
safe to auto-apply; remain proposal-only and require independent real-need
evaluation before changing thresholds or fine-tuning.

Other exact counterfactual agreements were 66.54% for property kind and 36.15%
for transaction type. Transaction predictions were non-unknown for 63/78
unknown targets (80.77% false proposals among this small unknown-target group).
The high 95–98% agreement for several sparse optional fields is dominated by
their `unknown` targets and by the runner's unsupported-prediction suppression;
it is not evidence of high positive-class recall on real needs.

The same bounded run found 100% full-catalog city-resolver consistency on
4,434 generated states and 100% city-scoped neighborhood resolver consistency
on 1,999 exact-crosswalk rows / 587 unique city-neighborhood pairs. These names
were inserted from reference catalogs into deterministic templates, so these
checks only establish resolver/catalog wiring for exact names. They do not
measure recognition of naturally phrased or misspelled user locations.

Reproduction (using the manifest's committed `rowsProcessed` value at the time
of this run):

```bash
bun --conditions=react-server scripts/datasets/evaluate-divar-hypothetical.ts \
  data/divar/divar-hypothetical-needs-laya-full-v5-2026-09-26.jsonl \
  --max-rows 4800
```

The exact model output remains a proposal benchmark only. Before training,
collect independently authored real-need utterances and reviewed labels,
stratify them across app categories/cities and ambiguity/unknown cases, and
resolve source rights. Do not use Laya's own unreviewed predictions as their
own gold labels.

## Rechecked source coverage against current app catalogs (2026-09-26)

`bun scripts/datasets/audit-divar-app-coverage.ts` read the full source and
current catalogs: 1,000,000 Divar offer rows became 999,416 normalized rows
and 996,111 unique normalized text groups. The app has 1,207 valid city
catalogs and 48,110 unique city-neighborhood IDs, but only 382 source cities
map to app catalogs (31.65% of app cities); these are concentrated cities and
cover 925,129 normalized offers (92.57%). Only 16 of the app's 18 property
leaves occur in this source (`agency-services` and `land-rent` are absent).

The exact public-reference crosswalk maps 1,120/1,188 source city-neighborhood
pairs (94.28%), but those pairs cover only 420,989/999,416 retained rows
(42.12%); 68 pairs remain unresolved and most source rows do not identify a
neighborhood. The raw crosswalk has 421,106 mapped rows, 117 more than the
normalized corpus; the aggregate manifest says this fits within 584 excluded
rows but cannot reconcile those 117 row identities exactly. Thus this source
cannot supply complete coverage of the app's 1,207 cities, 48,110
neighborhoods, or all 18 categories. City/pair coverage must not be presented
as full-entity coverage.

The source manifest also records `cloudTransferAllowed: false` and requires
license review before redistribution. Dataset-level ODbL metadata does not by
itself clear individual listing content or privacy rights. The coverage audit
and its test are local and aggregate-only; no external transfer is authorized.

## Category-question prompt development check (2026-09-26)

The category choices previously exposed 18 property leaves plus `unknown`, but
most leaf criteria were only catalog path labels. Because leaves such as
`apartment-sale` and `apartment-rent` share the same display title, the option
text did not explain transaction, property, or duration distinctions. A shared
Persian criteria map now supplies specific meanings for the existing 18
canonical property leaves and an abstention rule for `unknown`; both `/post`
and the Divar proposal runner consume the same helper. The live v5 batch keeps
the older question object frozen in its manifest and was not restarted or
rewritten.

An on-device prompt-development A/B used 19 authored examples (one per leaf
plus one underspecified request), with the same choice IDs and same exact local
checkpoint. Against the v5 manifest's short-label criteria, exact agreement
was 5/19 (26.32%); with descriptive Persian criteria it was 9/19 (47.37%). The
ambiguous case changed from `apartment-sale` at 0.656 confidence to `unknown`
at 0.9922. This is a prompt-development fixture—not a held-out benchmark,
real-user accuracy, or training data—and some wrong answers remained highly
confident (for example, land-sale text became land-rent at 0.9723). Therefore
the prompt improvement is promising but still not safe evidence for automatic
category application or for fine-tuning.

The fixed, local-only reproduction is
`scripts/datasets/benchmark-laya-category-prompts.ts`. Its phrases and expected
slugs are marked authored-diagnostic-only and it writes no files. Build and
runtime quality still require an independently authored/annotated held-out
set with colloquial variants, negation, missing transaction, and ambiguous
property type. Keep model suggestions reviewable until that set is evaluated;
the real-need training-eligible row count remains zero.

## Live v5 proposal batch and first-party source recheck (2026-09-26 05:49 UTC)

The existing process handle was polled successfully; the run is still active and
was not restarted. Its atomic manifest reports 6,496 of 999,416 normalized
Divar offers committed, 203 batched inference calls, batch size 32, and only
`convaiinnovations/laya-multilingual` on MPS. The exact manifest-committed
41,942,502-byte prefix was parsed without printing row text: all 6,496 records
were valid JSON, had the expected hypothetical task type, `synthetic: true`,
`derivedFromSupplyListing: true`, `realNeedGroundTruth: false`,
`trainingEligible: false`, and `shadowOnly: true`; all used the approved model
and remained pending with `trainingUse: not_approved`. No duplicate source IDs
or normalized source-text groups appeared in this committed prefix. These
checks validate provenance and safety flags only, not proposal-label accuracy
or real-user demand.

The observed rate implies roughly 15 days for this full pass, with substantial
uncertainty from device load and service latency. The active manifest freezes
script version 5 and its original category-question criteria. The source runner
is now version 6 for any future run; this change does not alter the process or
data already being written.

The Docker daemon was not available during this recheck and a read-only Prisma
aggregate query failed to initialize, so no current `ServiceRequest` or
`IntakeTrainingExample` count is asserted. The publish caller currently passes
no `trainingConsent` to `captureTrainingExampleAsync`, which therefore fails
closed. No first-party consent-backed corpus was verified in this pass and no
fine-tuning was started.

## Expanded committed-prefix decision audit (2026-09-26 05:50 UTC)

`evaluate-divar-hypothetical.ts --max-rows 6496` evaluated exactly the
manifest-committed prefix while the append-only run continued. Counterfactual
category agreement was 1,112/6,496 (17.12%); Laya predicted `apartment-rent`
for 5,186/6,496 rows (79.83%). It matched only 12/1,990 `apartment-sale`
targets (0.60%) and 0/893 `land-sale` targets. For transaction type, agreement
was 2,338/6,496 (35.99%); it made a non-unknown proposal on 86/108 rows whose
counterfactual target was unknown (79.63%). Property-kind agreement was
4,313/6,496 (66.39%). The dataset remains at zero training-eligible rows.

These are diagnostic disagreements against seller-side structured fields
recast as hypothetical seeker targets, not independent accuracy on real
needs. They demonstrate that the active v5 category and transaction outputs
are not fit for auto-application or for treating predictions as labels. The
small authored prompt A/B remains development-only and does not override this
fuller v5 failure signal; a new version requires its own independent,
human-labeled evaluation before any training decision.

## Laya question truncation root cause and service fix (2026-09-26)

The shared local service used Laya's default `head_max_len=256`. Laya's
`build_sequence()` spends that budget on all option markers and rendered
criteria before instruction tokens. When the options do not fit, it truncates
the options and then the Persian instruction without failing the request. With
the exact cached tokenizer for `convaiinnovations/laya-multilingual`, the
current eight-question Divar set needs a head budget of 704 tokens; its
19-option category question has 577 rendered option/marker tokens plus a
97-token instruction. All eight complete prompts fit at 704; at the previous
256-token default the category options alone were previously losing most of
their distinctions. This is a concrete, reproducible cause consistent with
the category collapse observed in the v5 prefix.

`mini-services/laya-post/app.py` now computes the required head budget using
the installed Laya option renderer and the exact loaded tokenizer, includes
the option-marker and instruction tokens, rounds to 32, and uses a 768-token
ceiling. Both single and batch inference pass that value and `max_len=1024`.
If the tokenizer is unavailable or a question set cannot fit safely, inference
fails closed rather than returning a silently truncated decision. The service
returns the selected `headMaxLen` for observability. Its focused Python suite
passes seven tests, including both endpoints, dynamic 19-choice budgeting,
and rejection before inference when the budget exceeds the limit; Python
compilation, repository TypeScript typecheck, the post-natural test suite,
and the Divar question-factory test also pass.

The already-running v5 worker was not restarted or modified: it loaded the old
question set and implementation, and its append-only manifest remains at
script version 5. At the 2026-09-26 06:11 UTC recheck it had processed
7,424/999,416 rows over 232 calls on MPS. The prefix evaluation above is still the relevant
quality warning. This code fix is not evidence that the old run improved, does
not make its outputs training-eligible, and does not authorize relabeling those
predictions as ground truth. A future v6 worker/run must use the patched
service and pass an independent human-labeled evaluation before any training
use is considered.

## Status correction and candidate-scoped v7 pilots (2026-09-26 07:11 UTC)

The v5 process described above is no longer active. It was interrupted at its
last committed checkpoint and retained unchanged at
`data/divar/divar-hypothetical-needs-laya-full-v5-2026-09-26.jsonl`; its
manifest reports 7,520 rows and `status=interrupted`. It was not resumed or
overwritten.

The current v7 batch runner now shares `/post`'s candidate-scoped question
factory: Laya sees only multiple terminal real-estate candidates left by
deterministic parsing; singleton categories stay deterministic, and an empty
candidate list does not expand into an unrestricted 19-way guess. The short-
stay resolver also now runs before the generic commercial-premises shortlist,
so «دفتر برای چند روز» does not collapse to `office-rent`. Added regression
tests cover that wording and verify ambiguous commercial candidates stay
narrow.

Two new, local-only MPS pilots completed on the exact approved checkpoint:

- `data/divar/divar-hypothetical-needs-laya-v7-diverse-pilot-2026-09-26.jsonl`:
  389 synthetic rows; 16 app property categories and 382 mapped cities; 49
  calls; 111,192 ms summed model latency; 13 rows had exact city-neighborhood
  crosswalks.
- `data/divar/divar-hypothetical-needs-laya-v7-neighborhood-diverse-pilot-2026-09-26.jsonl`:
  1,496 synthetic rows; 16 categories, 382 mapped cities, 1,120 unique exact
  city-neighborhood pairs; 48 calls; 622,826 ms summed model latency.

Both outputs carry `synthetic=true`, `derivedFromSupplyListing=true`,
`realNeedGroundTruth=false`, `trainingEligible=false`, and pending rights/review
status. Aggregate corpus checks found no malformed or duplicate text rows and
no phone/email/URL pattern matches, but that is not comprehensive privacy or
content-rights clearance. The audit correctly qualified zero training rows.
The 1,120 exact pairs are 94.3% of the Divar source's 1,188 distinct
city-neighborhood pairs, but do not cover all app locations (48,110
neighborhoods); they cover 1,008 distinct mapped neighborhood names in this
selected run. The two source property leaves `land-rent` and `agency-services`
remain absent.

The neighborhood resolver returned the exact mapped target for all 1,120
constructed, city-scoped pilot phrases. This is a resolver-consistency check:
each generated utterance deliberately contains the expected catalog name. It
is not natural-user accuracy. The last full catalog audit recorded in this
document remains the broader reference: 47,187/48,110 exact top-one (98.08%),
98.64% recall including review candidates, and zero wrong unique auto-hits on
constructed phrases.

Counterfactual comparisons remain weak for direct Laya decisions on these
generated prompts: 36.09% transaction-type agreement, 63.09% property-kind,
54.11% deed-type, and only 33.14% agreement for `usage` where the expected
target is unknown (66.86% of answered cases proposed a usage anyway). The
candidate-scoped runtime category projection agreed with source-derived
counterfactual categories on 1,480/1,496 rows (98.93%), but mostly because the
deterministic parser had a singleton candidate; Laya was not asked to decide
category on these rows. None of these figures are real-user accuracy or gold
label validation.

At the observed v7 MPS rate, a million-row all-record inference pass would
require roughly 116 hours of summed model time at batch size 32, before source
scanning, restart overhead, and evaluation. No million-row v7 run or fine-tune
has started. Fine-tuning remains gated on independently reviewed labels and
source-rights/privacy clearance; the requested clarification on whether
source-side facts may be used as targets for a separately marked synthetic
task is still unresolved.

## v3 counterfactual pilot, authored diagnostic, and approved full pass (2026-09-26)

The v3 generator corrects two material pilot defects: it uses the actual source
`exampleId` when forming output keys, and it maps seller-side transaction facts
to a separate counterfactual seeker target instead of copying a seller's offer
action into a seeker's request. It also keeps listing price/rent/deposit out of
the seeker's budget/preferences and says “monthly” explicitly for monthly rent.
Generated sentences use deterministic Persian templates; Laya is used only for
typed decisions, never for text generation. The disclosure and provenance mark
each result as a hypothetical proposal derived from supply-side listings.

The completed v3 neighborhood-diverse pilot contains 1,496 unique proposals
from 999,416 filtered source-fact rows, with 16 app property leaves, 382 mapped
cities, and 1,120 exact city-neighborhood pairs. It used 48 local batched calls
on MPS; summed model latency was 813,262 ms (about 13.6 minutes), and the JSONL
is about 9.1 MB. The full pilot manifest is
`data/divar/divar-hypothetical-needs-laya-v3-neighborhood-diverse-pilot-2026-09-26.jsonl.manifest.json`.

Against source-derived counterfactual fields—not human labels or real seeker
ground truth—the raw Laya agreement was: property kind 916/1,471 (62.27%),
transaction 696/1,488 (46.77%), deed type 117/207 (56.52%), parking 166/246
(67.48%), elevator 73/109 (66.97%), and storage 97/133 (72.93%). For usage,
all 169 expected values were unknown; Laya proposed a non-unknown value in 84
cases (49.70%), so that field must remain review-only. Laya received a category
question on only 1 of 1,496 rows; therefore the runtime category agreement of
1,480/1,496 (98.93%) is mostly deterministic singleton-candidate resolution,
not evidence of Laya category accuracy. Likewise, city exactness (1,495/1,496)
and neighborhood exactness (1,120/1,120) were measured on constructed prompts
that deliberately include the mapped place names; they establish resolver
consistency, not general Persian location accuracy.

A separate 19-case authored diagnostic found exact standalone category choice
on 4/19 examples (21.05%) with both short and descriptive prompts. Deterministic
candidate recall was 18/19; the runtime narrow flow agreed on all 19, including
one unknown that Laya alone overcalled. The fixture is diagnostic only, not a
held-out representative set. It reinforces the rule that model confidence is
not a correctness guarantee and that ambiguous values must not be auto-applied.

The source facts contain 999,416 rows after filtering from the official
Divar/Hugging Face card's 1M-row ODbL dataset
(https://huggingface.co/datasets/divarofficial/real_estate_ads). A fresh
streaming recount over the actual facts JSONL found 995,875 distinct normalized
text hashes and 3,541 repeated rows; the source manifest's 996,111 distinct
groups describes the upstream audit before conflict filtering. The facts
manifest records 583 conflict rows and one unmapped category. Because the full
runner keeps one example per normalized text group, its ceiling from this
filtered facts file is 995,875 unique candidates before later safety/proposal
skips—at least 4,125 short of one million. Do not bridge the gap with duplicate
or paraphrased copies and call them independent examples. The published
license label is not a complete privacy, attribution, or downstream-training
clearance; those reviews remain open.

After the user explicitly approved local batched Laya processing with outputs
separate and labelled hypothetical/proposed, the full append-only run was
started at
`data/divar/divar-hypothetical-needs-laya-full-v3-2026-09-26.jsonl`, with its
sidecar manifest. It is script version 9, task/schema v3, batch size 32, and
uses only `convaiinnovations/laya-multilingual` on MPS at loopback. The first
committed checkpoint had 96 rows over 3 calls. The pilot rate implies roughly
150 hours of summed inference for the remaining full pass, before source scan,
restarts, and evaluation; this is an estimate, not a completion claim. Disk
space was 104 GiB available at launch and the pilot scale implies a several-GB
output. The process is resumable from committed checkpoints; do not modify or
reuse the output under a different task/script version.

At the latest recorded progress check (2026-09-26 08:25 UTC), the full run had
committed 1,184 rows in 37 calls (7,132,272 output bytes) and remained
`running`.

The full-run rows are marked `synthetic=true`, `derivedFromSupplyListing=true`,
`realNeedGroundTruth=false`, `isNeedGroundTruth=false`, and
`trainingEligible=false`. Laya predictions are proposals only, never gold
labels. The user approved batch proposal generation, not source-derived
fine-tuning targets; therefore no fine-tuning has started. Training remains
blocked on a separate explicit decision, independently reviewed labels, and
privacy/rights clearance. The only permitted inference model remains the
specified local Laya checkpoint; failures must remain manual/rules-only and
must not trigger another model.

## Current correction: full v3 proposal run interrupted; no training data gained (2026-09-26)

The paragraph above's `running` status was superseded. The full v3 local Laya
proposal run was interrupted at its last committed checkpoint at 2026-09-26
08:27 UTC. Its manifest records `status=interrupted`, 1,312 rows, 41 local
MPS calls, 7,906,533 committed output bytes, and
`operator_interrupted_at_committed_checkpoint`. The JSONL and manifest are
preserved; the run has not been resumed. These 1,312 records remain
hypothetical, source-derived proposals, not real needs, human-verified labels,
or training-eligible examples.

The five individually curated Divar-derived proposal batches currently have
68 rows total across 16 mapped property categories and 22 cities. A read-only
JSONL audit confirms 68 unique source IDs and that every row is marked
synthetic, not real-need ground truth, and ineligible for both real-need and
synthetic-auxiliary fine-tuning. Their manifests mark the targets as not
human-reviewed for training. This is 0.0068% of a 1,000,000-row target;
more importantly, inspecting the source offer cannot establish a buyer's or
tenant's actual intent. Manual inspection improves source-fact traceability,
not the epistemic status of the inferred seeker request. Do not merge these
rows into a real-need corpus or treat their Laya outputs as labels.

The first-party capture path is also not currently a source of consented
training examples: `IntakeTrainingExample` has no durable consent columns,
`captureTrainingExample` fails closed unless a consent object is supplied,
and the normal `/api/need-intake/publish` caller supplies none. Therefore the
normal publish flow cannot currently create eligible examples. The local
Docker API was inaccessible during this audit, so no current database row
count is claimed. Any historical rows would still require provenance,
consent, human-label, deduplication, and rights review before eligibility.

No fine-tuning has started. A million manually inspected records cannot be
completed by the present small-batch workflow, while automatically reframing
all seller listings would violate the user's current no-bulk-script
constraint and would still produce hypothetical—not real—needs. The v3 run
must remain stopped until the data-generation constraint is resolved; no
duplicate/paraphrase expansion or change of labels may be used to manufacture
the target count.

## Aggregate re-audit of proposal artifacts and source fit (2026-09-26)

Executed the existing read-only `scripts/datasets/audit-laya-corpus.ts` against
all five manual batches and the exact committed v3 checkpoint, without printing
source text or row IDs. Across the manual artifacts the audit confirms 68
unique texts, no duplicate normalized text, no matching phone/email/URL
patterns, zero per-row consent metadata, zero human-reviewed labels, and zero
eligible rows. Every manual row is marked synthetic and not ground truth. The
full v3 prefix contains 1,312 structurally parsed rows, 1,303 unique texts,
nine same-target duplicate texts, zero conflicting duplicate groups, zero
matching contact patterns, zero human-reviewed labels, and zero eligible rows.
All 1,312 rows are classified as supply-side listings and all are synthetic.
The absence of these narrow PII patterns is not comprehensive PII clearance.

The v3 duplicate root cause is in the runner: it deduplicates input
`normalizedTextGroupSha256` before converting listing facts into generated
first-person state, but does not deduplicate the final normalized `state`.
Different source offers that collapse to the same deterministic template and
attributes therefore survive as repeated output text, while the manifest's
`duplicateTextGroupsSkipped` counts only source-group duplicates. This is a
quality defect for the hypothetical artifact and must be fixed and regression-
tested before any future proposal batch; it does not make that task real-user
training data.

The current catalog/source coverage was rechecked with
`bun scripts/datasets/audit-divar-app-coverage.ts`. The audit reads the current
app catalogs plus the normalized source manifest and crosswalk; the reported
1,000,000 source-row count is manifest lineage, not a fresh CSV rescan in this
command. Results: 999,416 normalized offer rows; 16/18 property leaves present
(`agency-services` and `land-rent` absent); 382/1,207 app city catalogs
represented (31.65% catalog coverage); 92.57% of normalized offers have a
mapped app city; and exact mapped neighborhoods cover 420,989/999,416 rows
(42.12%). The app has 48,110 city-scoped neighborhood IDs, while 68 of 1,188
source city/neighborhood pairs remain unresolved. Even the recognized source
locations are seller-offer locations, not seeker intent.

Targeted public-source discovery found the official Divar corpus described as
one million real-estate advertisements, not seeker requests
([official dataset card](https://huggingface.co/datasets/divarofficial/real_estate_ads)).
No public, licensed Persian real-estate seeker-request dataset was found in
that search; this is not proof that none exists elsewhere. Laya's official
documentation describes typed `choice`/`score`/`noul` decisions and explicitly
no text generation ([official Laya repository](https://github.com/NandhaKishorM/laya)).
The standard public fine-tuning notebook uses the separate English
`convaiinnovations/laya` checkpoint and is only a method reference, not a
ready-made fine-tune for the required multilingual checkpoint
([official notebook](https://github.com/NandhaKishorM/laya/blob/main/notebooks/laya_finetune_typed_decisions_2xT4_kaggle.ipynb)).

The reproducible aggregate checks are in
`docs/laya-real-estate-corpus-eligibility-audit-2026-09-26.ipynb`. Its JSON
and every code cell were validated/executed in order with the installed Python
interpreter, invoking the existing audit commands. Native Jupyter/nbclient
execution and rendered notebook inspection remain unverified because neither
Jupyter nor nbclient is installed in this environment. No raw source text was
embedded in the notebook.

The focused safety regressions were also rerun: the semantic eligibility
suite passed 18 checks, the dedup-index suite passed 9 checks, and the
counterfactual finalizer suite passed 9 checks. The dedup-index suite validates
the generic source-text index but does not cover the generated-state duplicate
path identified above; the observed nine output duplicates remain a concrete
uncovered regression, not a passing quality claim.

## Exact multilingual checkpoint revalidation (2026-09-26)

Re-ran `scripts/datasets/finetune/check_laya_multilingual.py` with the pinned
service environment at `mini-services/laya-post/.venv/bin/python` (the system
Python does not have Laya installed). Offline preflight passed for the exact
checkpoint `convaiinnovations/laya-multilingual`, revision
`e4e9ddf21a7b1903b7acffd8814ad4307bf63a67`, weight SHA-256
`9d628fd971b700382ac6f65920a86f149777b2e748e0c955fb3b19695aa8f204`, 170
state-dict tensors, and 321,908,995 parameters. `laya==0.3.20` and PyTorch
2.14.0 loaded it on CPU; strict state-dict validation and the two-field local
typed-inference smoke test passed with remote access disabled. The script
explicitly reports `training_performed=false` and `checkpoint_written=false`;
this verifies the base checkpoint/runtime only, not a fine-tuned artifact or
real-estate accuracy.

## User-approved local batch continuation and current measured baseline (2026-09-26)

The user explicitly approved local batch processing with only
`convaiinnovations/laya-multilingual`, with Divar-derived outputs kept separate
and labelled hypothetical/proposed. This supersedes the earlier no-bulk-batch
constraint; it does not turn seller offers or Laya predictions into real-need
ground truth.

A fresh CPU-only worker was started on loopback port 8121, separate from the
pre-existing MPS `/post` worker on 8111. The exact model health check passed on
both. A 32-row smoke batch completed on each device. CPU took 23,780.97 ms for
one 32-state call (about 1.35 states/second); MPS took 141,527.35 ms for its
first measured 32-state call. The CPU/MPS output choices differed on 1 of 83
field decisions; both devices were wrong on that synthetic purchase example.
The MPS measurement may include device contention and is not used as the full
run estimate. The host reports 16 GiB RAM and 41% system memory free at the
measurement point.

The 32-row prefix is not a representative sample: it covers only eight
categories and 17 cities, and its prompts are deterministic templates that
insert catalog labels. In this synthetic-only check, Laya matched 20/32
property-kind targets, 13/32 transaction targets, 4/8 deed targets, 3/5
usage-unknown targets (two false proposals), 3/4 parking targets, and 2/2
elevator targets. The category question was not asked on any of the 32 rows;
the runtime's 32/32 category agreement came from deterministic singleton
candidate resolution. The deterministic full-catalog city resolver matched
30/30 inserted city names, and the neighborhood resolver matched 18/18
inserted exact catalog neighborhoods. These figures are wiring/template
consistency checks, not accuracy on real user-written Persian requests.
Training-eligible rows remain zero.

The full v6 local proposal run started at 2026-09-26 09:14:50 UTC using the
CPU worker and batch size 32. At the 09:18:11 UTC checkpoint it had committed
288 rows in 9 Laya calls (1,747,339 output bytes), with the exact multilingual
checkpoint and synthetic/training-ineligible flags. The 32-row CPU smoke
suggests roughly 8.6 days for the 995,875 unique-source ceiling if throughput
holds; the early full-run checkpoint is consistent with a multi-day run, not
a completion estimate. The runner skips 3,541 repeated source-text groups,
leaving 995,875 unique source texts before generated-text deduplication and
proposal validation. This corpus alone cannot supply one million unique
source-backed prompts. No augmentation or duplicate inflation has been added;
the user was asked whether separately tagged, source-grouped hypothetical
augmentation is acceptable.

The current full-run artifacts are
`data/divar/divar-hypothetical-needs-laya-full-v6-2026-09-26.jsonl` and its
`.manifest.json`. The run is resumable and currently in progress. Laya outputs
are proposals/evaluation only. If a later supervision candidate is built, its
targets must come from deterministic source facts, never the model's own
predictions, and remain distinct from real-need data.

At the 2026-09-26 09:23:35 UTC checkpoint, v6 had committed 768 rows in 24
calls (4,625,419 bytes). Since 09:14:50 UTC, this is about 1.46 rows/second;
the simple linear estimate is approximately 7.9 days for the source-unique
ceiling. The estimate remains hardware/load-sensitive and is not a completion
claim.

The small-run source reader was also corrected: limit mode now stops consuming
the JSONL as soon as the requested number of candidates is buffered. A live
`--limit 1` test produced one row after consuming two source lines, and the
read-lines regression test passed. Focused ESLint passed for the runner and
test. The already-running full v6 process loaded the prior source before this
reader-only change; its `--all` behavior is unchanged.

The installed `laya==0.3.20` inference API has no built-in `fit`/training entry
point. The official fine-tuning notebook performs RLCD-style reward plus soft
cross-entropy training, reserves a calibration split, and uses 2×T4 DDP, but
its base checkpoint is `convaiinnovations/laya` (English), not the required
multilingual checkpoint. It is a method reference only; it must be adapted and
validated against the pinned multilingual model before any training run. The
current local worker/API is inference-only, so no fine-tuning has started.

## Full v6 continuation checkpoint (2026-09-26)

At 2026-09-26 09:33:01 UTC, the resumable CPU v6 run had committed 1,664 rows
in 52 batched calls (10,056,027 bytes); the following process poll advanced it
to 1,856 rows. The manifest still reports zero invalid proposals and zero
source-group skips among the rows reached so far. It remains a running,
synthetic-only inference artifact; no training rows have been promoted.

I checked the host outside the restricted shell: Apple MPS is available, and
the exact local Laya worker is healthy on loopback. The active worker is
intentionally CPU-backed because the earlier same-task 32-state benchmark was
23,780.97 ms on CPU versus 141,527.35 ms on MPS. CUDA is unavailable. This is
an empirical workload result, not a general claim that MPS is slower.

The installed model supports `predict_batch` and the private worker caps it at
32 states. Increasing that cap while a multi-day resumable run is active would
add memory and accuracy-shape risk without a measured benefit, so v6 retains
its tested batch size. Its observed end-to-end throughput remains around
1.5-1.6 rows/second, meaning the complete source pass is still roughly a week
away if throughput and host availability hold. These are progress estimates,
not completion claims.

The upstream Laya notebook's RLCD + soft cross-entropy recipe expects two CUDA
T4s; the local environment has no CUDA and this CPU-first inference benchmark
does not establish a practical full-corpus training rate. Before a training
run, require a research-only checkpoint decision, completed corpus audit,
source/license review, source-group-disjoint splits, and a human-written
Persian holdout. The current synthetic set remains expressly ineligible for
the production model regardless of row count.

At 2026-09-26 09:43:05 UTC, v6 had resumed and committed 2,464 rows in 77
calls (14,913,422 bytes), still with zero invalid proposals and zero skipped
source-text groups. It was safely SIGINT-checkpointed at 2,240 rows during a
code-path diagnostic, then resumed against the same source hash, model,
question schema, batch size, and output; no rows were discarded or duplicated.
The diagnostic initially suspected input/answer misalignment, but tracing
`prepareAnalysis` showed `sourceText` is the generated `hypotheticalNeed.state`
when that mode is enabled, and `inferGroup` sends that same value to Laya. The
concern was disproved; v6 remains semantically aligned and did not require a
new run.

At 2026-09-26 09:50:29 UTC, the resumed v6 batch had committed 3,136 rows in
98 calls (18,983,490 output bytes), with zero invalid proposals and zero
duplicate source-text groups skipped at the current source prefix. From the
09:14:50 UTC start, observed throughput is about 1.47 rows/second; linear
projection to 995,875 unique source texts is approximately 7.8 days, subject
to host availability and sustained throughput. This is an operational
estimate, not a completion claim. The job remains CPU-backed and resumable.

## Latest quality checkpoint (2026-09-26 10:00 UTC)

The live v6 manifest now records 4,096 rows in 128 calls (24,781,948 bytes),
zero invalid proposals and zero duplicate normalized-text groups skipped in
the processed prefix. The full source is still running on CPU. At the observed
~1.48 rows/second, the source-only pass remains a multi-day run; the corpus
ceiling is below one million unique source texts.

I extended `scripts/datasets/evaluate-divar-hypothetical.ts` to report
per-field top confusions, then ran it on the completed neighborhood-diverse
v7 artifact (1,496 rows, 16 property-category leaves, 382 cities, 1,120 exact
mapped city/neighborhood pairs). This sample is geographically broader than a
prefix but is still offer-derived and synthetic. On its generated prompts,
counterfactual target agreement was: property kind 63.09% (1,471 answered),
transaction 36.09% (1,488 answered), deed type 54.11% (207), parking 77.24%
(246), elevator 80.73% (109), and storage 90.98% (133). For 18 transaction
targets marked unknown, 17 still received a non-unknown proposal (94.44%);
for usage, all 169 targets are unknown and 113 received a proposal (66.86%).
These are not user-intent accuracy metrics: most labels are mechanically
derived from the source offer/category and are not human reviewed. The added
confusion matrix shows major transaction errors (e.g. expected `buy` often
predicted as a rent/rahn class), so the current checkpoint is not suitable for
automatic field commitment.

The same evaluation found exact city and neighborhood resolver agreement on
the generated names (1,495/1,495 city labels and 1,120/1,120 mapped
neighborhood targets). Those names were inserted from catalogs/crosswalks, so
this only proves resolver wiring, not recognition of user-written locality
phrases such as colloquial or concatenated neighborhood names. Do not present
it as evidence that free-text neighborhood extraction works.

I rechecked the current first-party Laya sources. The required checkpoint is a
322M multilingual typed-decision encoder, not a text generator; its model card
reports near-chance zero-shot performance on a broad typed-decision benchmark
and says probabilities are uncalibrated. The official fine-tuning notebook
still hard-codes the English `convaiinnovations/laya` model, so it cannot be
run unchanged for this task. It uses an RLCD/proper-scoring objective plus a
soft cross-entropy term and a held-out calibration slice; an adapted run must
start from the exact pinned multilingual weights and use a source-group-
disjoint evaluation split. No fine-tuning has started.

The evaluator patch passed focused ESLint and completed the full v7 analysis.
The live v6 output remains the same resumable artifact and has not been
restarted or modified by this analysis.

## Local /post acceptance and v6 checkpoint (2026-09-26 10:25 UTC)

I ran a pointer-driven browser flow against the live Next.js app for the
user-provided Mashhad example: `من یک مغازه میخوام برای لوازم آرایشی محدوده
فرامرزعباسی ۱ ملیارد رهن دارم ۲۰۰ میلیون اجاره`. In a fresh browser profile
with the onboarding and cookie prompts already resolved, `/api/post/natural-analyze`
returned HTTP 200. The rendered local-Laya result preserved deterministic
`rahnAmount=1,000,000,000`, `monthlyRent=200,000,000`, transaction
`rent_rahn_ejare`, property kind `shop`, and neighborhood
`شهید فرامرز عباسی`; it explicitly flagged a Laya deal-type mismatch and kept
the deterministic transaction value. After the real “ادامه به تکمیل فرم” click,
step 2 rendered Mashhad as the city and `شهید فرامرز عباسی` as the selected
neighborhood. This closes the prior gap between the analyzer response and the
actual location controls for this exact example; it does not establish broad
neighborhood recall/precision.

The exact local worker health/smoke check also passed: model loaded as
`convaiinnovations/laya-multilingual`, CPU device, and one typed-decision
inference completed. No cloud inference or alternate model was used.

At 10:34:49 UTC, the resumable v6 Divar-derived batch had processed 7,072 rows
in 221 calls (42,770,996 output bytes), with zero invalid-proposal rows and
zero repeated-text groups skipped in the processed prefix. The source still
contains 999,416 rows and the run remains CPU-bound at roughly 1.5 rows/second;
this is a live checkpoint, not a completed dataset. All generated outputs
remain explicitly hypothetical and excluded from real-user ground truth and
production training. Prior v7 field-agreement metrics remain proxy-only and
show that the current checkpoint must not blindly commit categorical
predictions.

The focused offline checks also passed under Bun: 17 hypothetical-need
transformation checks, 18 question-factory checks covering all 18 property
leaves and abstention semantics, 10 counterfactual-supervision adapter checks
(which verify Laya predictions are never used as targets), 18 corpus semantic
eligibility checks, the neighborhood disambiguation suite, and 153 post
pipeline scenarios / 1,224 assertions. The npm aliases were not used because
they invoke `npx tsx`, which attempted a blocked registry download; direct Bun
execution required no network.

A scoped source search of `/api/post`, the `/post` Laya library, and
`mini-services/laya-post` found only the pinned multilingual checkpoint
reference and no calls/imports for the prohibited model vendors or hosted
inference APIs. This is a feature-scope source audit, not a whole-repository
claim about unrelated AI integrations.

## Divar source eligibility audit (2026-09-26 10:50 UTC)

Re-read the authoritative fact-corpus manifest and transformation code. The
source contains 999,416 non-synthetic rows from one million input records, but
each source is seller/agent supply, `humanReviewed=false`, and
`isNeedGroundTruth=false`. App mappings cover 925,129 city rows (421 source
cities) and 420,989 neighborhood rows (1,188 city/neighborhood pairs); only
16/18 property leaves occur. The two missing leaves are `land-rent` and
`agency-services`. This cannot certify the requested full city/category/
neighborhood coverage.

The source manifest records ODbL-1.0 but explicitly leaves individual content
rights and privacy review pending, says regex-only contact redaction is not
comprehensive, and sets `cloudTransferAllowed=false` and redistribution
disallowed. I therefore treat it as local-only shadow input, not an approved
training corpus. The repository's smaller Divar research summary is also not
a substitute: it has only 30 sample ads each for apartment-sale, villa-sale,
and land-sale, and zero for its other 14 categories.

The current counterfactual builder uses four deterministic sentence frames,
with optional attributes taken from seller listings. Its rows explicitly set
`realNeedGroundTruth=false` and `trainingEligible=false`; using one million
copies of that process would create a large correlated synthetic set, not one
million independent natural user needs. It also cannot establish preference
labels from supply attributes. Keep Laya's answers as shadow predictions only;
do not turn them into training targets.

At 10:50:25 UTC, the live v6 shadow pass had processed 8,544 rows in 267 calls
(51,712,719 output bytes), with zero invalid-proposal rows and zero repeated
normalized-text groups skipped in its processed prefix. The same resumable
CPU run and exact multilingual checkpoint remain active; no training has
started.

The privacy-preserving corpus audit was run against the live committed prefix
at 8,736 rows. It found 8,476 unique generated utterances (260 repeated rows),
16 categories, 305 mapped app cities, and 681 neighborhoods. Regex phone/email
checks found no matches in those generated rows, but the source manifest still
warns that regex-only review is incomplete. The audit's post-need fine-tuning
eligibility result was `false` with 0 qualified rows, as intended by the
fail-closed gate. Its source-proxy comparisons on this source-order prefix
(property kind 90.19% among 6,625 non-unknown predictions; transaction 55.87%
among 7,666) are heavily skewed, not human-reviewed, and must not be described
as user-intent accuracy or used to tune a production confidence threshold.

## Laya Persian fixture benchmark (2026-09-26 11:00 UTC)

The local exact-checkpoint benchmark completed on 56 author-curated Persian
development cases (`convaiinnovations/laya-multilingual`, CPU, zero request
failures). It is not a held-out or naturally sampled user dataset, and the
worker was concurrently serving the resumable corpus run; measured latency
therefore includes queue contention and is not an isolated performance claim.
Raw argmax results were weak: transaction type 33.9% (43/56 non-unknown,
10 known cases abstained, 27 wrong non-unknown); property kind 58.8% (41/51
non-unknown, 9 abstentions, 12 wrong non-unknown); parking 44.4% (8/9
non-unknown, 5 wrong); elevator 50.0% (7/8 non-unknown, 4 wrong); storage
60.0% (4/5 non-unknown, 2 wrong). Category-candidate coverage was only one
case, so its 0% result is not informative. Mean returned latency was 15.8s
per request and benchmark wall time 14.7 minutes under shared-worker contention.

These fixture scores do not justify committing Laya categorical choices in
production. Keep deterministic extraction and explicit user confirmation as
the authority; retain Laya outputs only as proposals/shadow evidence. No
confidence threshold should be fitted to these 56 cases. Memory use and
uncontended warm/cold latency have not yet been measured.

At 11:00 UTC, the full v6 local shadow batch had committed 9,504 of 999,416
source rows in 297 inference calls (57,552,236 output bytes); status remained
`running`. Its manifest's accumulated inference time was 6,091,675ms. Wall
throughput since the 09:14:50 UTC start is about 1.5 rows/second, implying
roughly 7.7 days for the full pass if rate and availability remain unchanged.
This is an estimate, not a completion commitment; the JSONL and manifest are
resumable checkpoints. Every row remains hypothetical, supply-derived,
unreviewed, and ineligible for training.

## Source coverage and live-prefix quality (2026-09-26 11:02 UTC)

The aggregate Divar-to-app coverage audit compared all one million source rows
to the current `/post` catalogs. The app has 18 real-estate leaf categories;
the source maps to 16 and has no `land-rent` or `agency-services`. The app has
1,207 city catalogs, while the source names 421 cities; 382 map to an app city,
so the source touches 31.65% of app city catalogs and 92.57% of normalized
offer rows have a mapped city. Exact neighborhood matching covers 1,120 of
1,188 source city/neighborhood pairs (94.28%), but only 420,989/999,416
normalized rows (42.12%) have an app neighborhood. The remaining 68 pairs are
unresolved. The normalizer retained 999,416 rows and skipped 584; aggregate
metadata cannot identify which exact neighborhood matches were among those
skips. Thus this source cannot support a claim of coverage for every app city,
category, or neighborhood.

A read-only audit of the live output prefix at 9,728 rows found 304 duplicate
generated texts (3.1% of rows), all with identical target fingerprints and no
conflicting duplicate group; no malformed/missing-text rows or phone/email
pattern matches were found by its limited regex audit. Coverage in that prefix
was 16 categories, 315 app cities, and 706 neighborhoods. These remain
synthetic, supply-side proposals: zero human-reviewed labels, zero consent or
license-cleared row evidence, zero qualifying training rows, and all 9,728
rows explicitly ineligible. The privacy regex is not a comprehensive review,
and the source manifest prohibits cloud transfer pending rights review.

## Parser regression fixes and 10k counterfactual round-trip (2026-09-26 11:33 UTC)

Two deterministic-classification regressions were fixed in the `/post` parser:
location-cued neighborhood phrases are removed before property-kind/category
classification (so a neighborhood containing «ویلا» does not turn an apartment
into a villa), and the bounded industrial token «انبار» no longer matches the
amenity «انباری». The commercial-property resolver and legacy parser both have
regression coverage for shops with storage and explicit industrial warehouses.
The post-natural self-test and business-commercial-property self-test pass;
targeted ESLint and `git diff --check` also pass.

The current-extractor evaluation over 10,000 committed v6 counterfactual rows
reports 9,999/10,000 deterministic category and property-kind round trips,
10,000/10,000 transaction and area round trips, and 4,174/4,174 exact
city-scoped neighborhood resolutions among rows with mapped neighborhood
targets. The exact-checkpoint Laya categorical category decision was `unknown`
for all 10,000 compared examples; deterministic templates/crosswalks explain
the high round-trip figures. These are generated-label consistency checks,
not evidence of real-user accuracy and not training labels. The full catalog
city resolver matched 9,240/9,240 rows for which its catalog entry existed;
760 source rows lacked an app catalog match. Source coverage remains only
382/1,207 app cities, 16/18 app real-estate categories, and 42.12% mapped
neighborhood coverage in the normalized source.

At 11:33:40 UTC, the resumable local v6 batch had committed 12,928/999,416
source rows in 404 calls (78,325,802 output bytes), status `running`, with no
duplicate normalized-text groups skipped. Output remains hypothetical and
training-ineligible. No fine-tuning has started. The source dataset's ODbL
label does not by itself clear rights in individual listing content or privacy
rights; those remain a separate review gate before training or redistribution.

## Compound neighborhood extraction follow-up (2026-09-26 11:51 UTC)

The remaining 1/10,000 synthetic category mismatch was traced to «تهران‌ویلا»:
normalization separates the compound token and the city-aware extractor had
discarded its leading «تهران». Explicit location-cued spans now preserve that
city-like component, trim trailing city/filler/amount text without truncating
the neighborhood, and use the full city-scoped resolver. Regression evidence:
«تهران‌ویلا» with selected city Tehran resolves to catalog id `تهرانویلا`,
while an explicit apartment remains `apartment-sale`; «الهیهٔ تهران» and
amounts following «فرامرزعباسی» also remain correctly bounded. Post-natural,
location-priority, neighborhood-disambiguation, commercial-property,
counterfactual-transform, question-factory, and semantic-eligibility tests
passed; targeted ESLint and `git diff --check` passed.

Re-running the current parser against the same 10,000 committed proposal rows
gave 10,000/10,000 runtime-category agreement and 4,174/4,174 exact
city-scoped neighborhood resolutions for rows with mapped targets. This is
still template/crosswalk consistency only, not a real-user accuracy claim.
Only the exact `convaiinnovations/laya-multilingual` local checkpoint is used;
its category decisions remained unknown in the prior 10k audit, so no Laya
category outputs are treated as gold labels.

At 11:50:55 UTC, the v6 local-only run had committed 14,592/999,416 source
rows in 456 Laya calls (88,410,188 output bytes), with status `running`, zero
invalid proposals, and zero duplicate-text groups skipped. The user confirmed
Divar-only scope and accepted the source's catalog coverage limits. No
fine-tuning has started; source-content/privacy and downstream license review
remain prerequisites for training or redistribution.

The route-level `/api/post/natural-analyze` self-test also passes with the Laya
endpoint deliberately unavailable: the rules-only path returns canonical
Vanak and Tehran-Villa neighborhoods and their neighborhood centroids without
rewriting a city locked by the user. This confirms the fix at the API seam,
not only in the extractor unit test. At 11:58:06 UTC, the batch had advanced
to 15,296/999,416 rows in 478 calls (92,679,224 bytes), still running with no
invalid proposals reported.

## Source/target separation correction and measured CPU cost (2026-09-26)

A source-semantics audit found that the in-progress v6 shadow run was passing
the deterministic hypothetical seeker sentence to Laya, even though the
question was supposed to inspect the Divar seller/agent ad. Because that
sentence and its evaluation targets were both derived from the same structured
Divar facts, v6 model-agreement figures are methodologically invalid (target
leakage), not evidence of extraction accuracy. The run was stopped safely at a
committed checkpoint and its manifest is `interrupted`: 16,704 rows, 522
inference calls, 101,204,837 output bytes. The output is retained for audit and
must not be resumed or used as model evaluation/training evidence.

The runner now writes a separate v4 task. Laya receives only the original,
screened Divar offer text; the generated hypothetical seeker sentence remains
in its own `state` for parser consistency checks. A SHA-256 of the actual Laya
input is recorded without copying raw ad prose into the output. Offer-side and
hypothetical-need question schemas have separate hashes. `trainingEligible`
remains false, and the supervision adapter rejects Laya predictions as target
labels. The evaluator now compares Laya category, property-kind, and
category-mapped deal decisions only against the corresponding persisted Divar
structured fields; fields without persisted source labels are explicitly
unscored. Parser agreement against the generated need remains a separate,
synthetic consistency measure.

An exact-checkpoint local smoke processed 32 source rows in one batch. All
32/32 Laya-input hashes matched the original normalized source states, and all
outputs remained synthetic/ineligible. On this source-ordered smoke prefix,
Laya category was requested for 13 rows (rules left multiple candidates):
7/13 exact among answered (53.85% conditional accuracy), only 13/32 decisions
made (40.63% coverage), and 7/32 exact across all rows (21.88%). Property kind
was 12/26 exact among answered (46.15%); transaction type was 2/11 (18.18%).
The 32-row prefix is not randomized or representative; these figures are only
a smoke warning, not a Persian real-user benchmark. Deed, usage, and amenities
are not scored because the normalized Divar artifact does not persist reviewed
source targets for them. Deterministic category/area/location round-trips are
also not independent accuracy: their target attributes were used to compose
the hypothetical text.

The v4 offer questions were expanded with Persian lexical distinctions for
property kinds, rent modes, sale-vs-seeker perspective, and unknown handling.
On the same 32-row prefix this prompt variant took 47.114 seconds for a batch
of 32 (about 0.68 rows/second on the current worker: CPU, six Torch threads,
MPS built but unavailable, CUDA unavailable). Its output was 203,361 bytes;
linear scaling suggests roughly 6.35 GB for 999,416 normalized records and
about 17 days of continuous CPU inference. These are rough extrapolations from
one small batch, not a runtime guarantee. The prompt change improved the
observed deal-type exact count from 0/11 to 2/11 but lowered category from
8/13 to 7/13 and property kind from 17/26 to 12/26; this unstable tiny prefix
does not justify freezing a prompt or starting the full run. No million-row
v4 run has started.

One regression test proves that the v4 evaluator scores a deliberately
different source category/transaction against source-offer fields, while its
parser check continues to use the separate hypothetical-need target. The
question factory, source-input semantics, supervision adapter, finalizer, and
evaluator tests pass; targeted ESLint and `git diff --check` pass. Fine-tuning
has not started: all generated need examples are hypothetical, no
human-confirmed need labels exist, and Divar individual-content/privacy and
downstream-license review remains unresolved. Do not call the derived corpus
one million real needs or promote it to training data.

## Divar-only neighborhood-diverse v4 pilot (2026-09-26)

Following the user's explicit Divar-only source choice, the v4 prompt2
neighborhood-diverse pilot completed locally on the exact
`convaiinnovations/laya-multilingual` checkpoint. It read all 999,416 normalized
source rows and selected 1,496 deduplicated examples: one deterministic
representative per mapped city/neighborhood pair, plus category/city coverage.
The output is 9,643,317 bytes; all 1,496 rows remain synthetic, proposal-only,
and `trainingEligible: false`. The sample covers 382 app cities, 16 of 18
property leaves, and 1,120 exact city/neighborhood pairs. The Divar source's
unmapped-city/category coverage limits remain accepted, not filled from other
sources.

The 32-row request timed out after 448 committed rows. No partial batch was
written. The run was safely resumed from that exact checkpoint at batch size 8;
runner v11 permits this narrow resume migration only when source hash, model,
selection, and question contract match, and it rejects increasing batch size.
The resumed run completed at 1,496/1,496 with zero contact-pattern or invalid
proposal skips. Across 145 calls, mean worker inference latency was 12.308 s per
request. A simple linear estimate for ~999k rows is approximately 13 days and
~6.4 GB of JSONL on the current CPU worker; this is an extrapolation, not a
commitment or capacity guarantee. The separate MPS authored benchmark timed
out, so no MPS throughput claim is made.

Source/target integrity was verified by streaming the source corpus and
recomputing each recorded Laya-input hash: 1,496/1,496 matched the original
seller/agent offer text. No raw offer prose was copied into the output. Against
Divar's persisted offer-side labels (not synthetic need targets), Laya exact
agreement was weak: category 174/714 answered (24.37%, 47.73% decision
coverage); property kind 692/1,217 (56.86%); transaction type 47/536 (8.77%).
The high unknown rate and frequent category/deal confusions make these
predictions unsuitable as pseudo-gold or as the conversion authority. Deed,
usage, and amenity predictions remain unscored because the normalized source
artifact has no reviewed labels for them. Area/room agreement (100%) is only a
counterfactual-template consistency check, not independent extraction quality.
No full-million inference run or fine-tuning run has started.

Location checks distinguish two different things. When the generator inserts
an exact catalog neighborhood into a synthetic sentence, the catalog resolver
returns the intended pair for 1,120/1,120 cases; this is wiring consistency,
not natural-language accuracy. On the same 1,120 source ads whose structured
Divar location has an exact official crosswalk, resolving neighborhood from
the original ad prose with the selected city context yields 94 exact top-one
matches (8.39%), 104 ambiguous candidate sets, 715 no-match results, and 207
wrong top-one hits. Many ads simply omit the structured neighborhood from
their prose, so these figures do not estimate need-text accuracy; they do show
that structured location metadata cannot be discarded when deriving records.
The full catalog city resolver recognizes the generated catalog city for
1,495/1,495 rows, while the narrower phrase extractor recognizes 1,324/1,495
(88.56%); production analysis must use the full catalog resolver.

The question-factory, source/target-separation, supervision-adapter,
finalizer, and evaluator tests pass after the safe-resume change; full TypeScript
typecheck and targeted ESLint pass. The current pilot is evidence against
blindly scaling model-generated labels: next training-data work must use
auditable source-structured targets for clearly marked hypothetical examples,
keep seller facts distinct from seeker preferences (especially prices and
amenities), and retain a human-reviewed holdout before any fine-tune.

## Structured offer facts and counterfactual v5 smoke (2026-09-26)

The user confirmed Divar is the only permitted source and accepts the source's
city/category coverage gaps. The corpus builder now retains a versioned
`sourceOfferAttributes` object for seller-side area, room count, deed enum, and
explicit amenity booleans. The data remains an offer-facts task; these facts are
not seeker labels. Price, rent, and credit are still excluded, and the manifest
requires local-only handling and pending privacy/content-rights review.

A source-ordered 10,000-row corpus pilot completed from the pinned Divar CSV:
10,000 offers, 316 mapped app cities, 815 distinct source city/neighborhood
pairs, and exact app-neighborhood mapping on 4,171 rows. Structured-field
coverage was 8,469 area, 8,454 room-count, 2,514 deed, and 7,227 with at least
one recorded amenity; 9,240 rows mapped to an app city. This is a prefix smoke,
not a balanced sample or full-corpus coverage claim.

The pinned CSV has 1,000,000 source rows, but the existing clean offer-facts
manifest retains 999,416: 583 rows/groups were rejected for category/city
conflicts and one for an unmapped category. With Divar as the sole source, the
current unique clean ceiling is therefore below one million; padding with
duplicates or pretending rejected rows are clean would invalidate the count.

Running the v5 transformer over that whole 10,000-row prefix produced 10,000
auditable proposals, with no unsupported-category skips. It found at least one
structured-vs-prose contradiction in 1,977 rows (19.77%): 1,503 area, 234 room,
288 parking, 116 storage, 47 deed, and 73 elevator conflicts (field counts may
overlap across rows). Conflicted values are suppressed, not resolved by model
guessing. This is a material source-consistency issue and is why the synthetic
proposal output remains quarantined from training.

The counterfactual converter is now v5. It suppresses conflicting structured
and prose values to `unknown` and carries field-level conflict provenance into
the output. It also keeps source zero-room values unknown because the current
need schema has no canonical zero/studio numeric value; it no longer generates
unparseable «بدون اتاق خواب» training-like text. The v5 local CPU Laya smoke
completed 32 rows in four batches. All 32 Laya input hashes matched the exact
source-offer states; no raw offer text was copied into the output. Four
structured/text conflicts were recorded (three area, one room), one zero-room
value stayed unknown, and all rows remained synthetic and training-ineligible.

On this non-random 32-row source prefix, Laya matched Divar's offer category
for 7/13 answered cases (53.85% conditional; 7/32 exact overall), property kind
for 12/26 (46.15%), and transaction for 2/11 (18.18%). Deed, usage, and
amenities remain unscored as Laya targets because there is no reviewed source
label contract for them. The 100% deterministic parser agreement across the
generated v5 sentences is only self-consistency (the same source facts created
both the sentence and target); it is not extraction accuracy. Exact neighborhood
resolution on 18 generated, crosswalk-backed examples is likewise only wiring
consistency. These results do not justify pseudo-gold promotion or fine-tuning.

The 32-row run used the exact approved checkpoint on CPU, with mean worker batch
latency 9.001 seconds for batches of eight. Linear extrapolation is roughly
13 days and 6.9 GB of output for ~999k source records, not a throughput promise.
The local worker remains separate from the website and reads only the cached
multilingual checkpoint. No million-row inference or fine-tuning run has been
started. Divar-only source choice is respected; missing categories/cities are
not filled from another source. A one-million-row *hypothetical* corpus would
still not be a one-million-row real-need dataset or sufficient evidence for
fine-tuning without independent review and a genuine need-text holdout.

### Later same-day update: full v5 run is now active

The previous sentence's statement that a million-row inference had not started
was true at that earlier checkpoint and is superseded here. A fresh v5 run is
now processing the rebuilt structured source locally. Its latest manifest
checkpoint records 224/999,416 rows in 28 calls, status `running`, exact model
`convaiinnovations/laya-multilingual`, CPU device, and 1,536,828 output bytes.
It remains a synthetic, supply-derived proposal run; it does not qualify rows
for fine-tuning. All v3-v6 interrupted artifacts remain untouched.

At the next recorded checkpoint (2026-09-26 14:53 UTC), the same run had
advanced to 464/999,416 rows in 58 calls and 3,180,458 output bytes. The
filesystem still had 93 GiB available; no source or existing run artifact was
overwritten.

At 2026-09-26 14:55 UTC, the live run reached 576 rows / 72 calls. A streaming
audit that observed the append-only file at 624 rows found zero malformed or
missing-text rows, zero regex PII-pattern matches, zero duplicate proposal
texts, complete row provenance, and zero qualified training rows. Its prefix
coverage was 15 categories, 133 app cities, and 183 neighborhoods. A separate
576-row source-order evaluation found Laya offer-label agreement of 67/272
category answers (24.63%), 282/470 property-kind answers (60.00%), and 21/219
transaction answers (9.59%). The generated-text parser's 576/576 category and
243/243 crosswalk-neighborhood agreement are circular/wiring checks, not
independent natural-language accuracy.

### Later update: compact category head and v6 full run

The v5 full run was safely interrupted at its persisted checkpoint of 1,872
rows after a first MPS request returned HTTP 422. The cause was the 19-choice
category question exceeding the installed worker's head-token budget. The
shared `/post` category meanings and the Divar offer-side meanings are now
concise while retaining explicit distinctions; the complete offer question
definition is 1,255 JSON characters across all 19 choices. The question
factory, offer semantics, hypothetical transformation, evaluator contract,
and `/post` route self-tests pass. A local MPS end-to-end smoke processed all
32 records in four batches with no rejected rows and no 422.

On the same 32-row non-random prefix, Laya matched the structured Divar offer
category on 4/13 answered cases (30.77%), property kind on 10/26 (38.46%), and
transaction on 1/11 (9.09%). These are supply-label comparisons, not seeker
intent accuracy; category/kind/transaction mismatches and abstentions make
this output unsuitable as pseudo-gold for fine-tuning. The synthetic output
still marks every row as not real-need ground truth and training-ineligible.

Batch-size timing on the MPS worker was 9.236 seconds per batch of 8, 42.934
seconds for 16, and 44.638 seconds for 32. The MPS worker's measured macOS
physical footprint reached 17.0 GB (17.1 GB peak), with high swap; that
experimental worker was stopped. The CPU worker used about 2.0 GiB RSS. The
current full v6 job therefore uses the local CPU worker at batch size 8. At
its 128-row checkpoint, mean worker latency was about 9.1 seconds per batch;
linear extrapolation is about 13.2 days and roughly 6.9 GB of output if it
finishes without skips. This is a rough estimate, not a completion promise.

The v6 run is a new append-only artifact using the compacted question hash;
the interrupted v5 artifact remains intact. Its checkpoint manifest, not this
paragraph, is authoritative for live progress. The source is only the pinned
Divar real-estate dataset, and the clean input ceiling remains 999,416 rather
than one million. No fine-tuning has started: model-generated hypothetical
labels are proposals, not independently reviewed training targets.

### User-authorized synthetic-only Laya fine-tuning pilot (2026-09-26)

The user explicitly authorized an isolated experiment on Divar-derived
hypothetical needs, while accepting that these are proposed examples and not
real-user ground truth. This supersedes the earlier “no fine-tuning has
started” status above. Laya's own predictions were **not** used as labels.

The pilot intentionally used the newer conflict-aware v5 converter output,
not the older 16,704-row v3 prefix: later audits found that the older converter
did not suppress structured/prose conflicts. The selected partial v5 corpus has
1,872 distinct source groups and a persisted disjoint split: 1,525 train, 178
calibration, and 169 held-out test rows. It represents a source-order prefix,
not a random or city/category-balanced sample; 15 category leaves appear, the
rarest observed category has only two examples, and three catalog leaves are
absent.
Therefore the result is a code-and-learning pilot, not a coverage-complete
estate model.

Training loaded only the pinned local
`convaiinnovations/laya-multilingual` checkpoint (revision
`e4e9ddf21a7b1903b7acffd8814ad4307bf63a67`, weight SHA-256
`9d628fd971b700382ac6f65920a86f149777b2e748e0c955fb3b19695aa8f204`). It ran
for one epoch on CPU with eight threads and batch size eight, taking 1,527
seconds. The 322M-parameter encoder was frozen; 14,770,945 parameters in Laya's
decision head, type embedding, and scorer were trained using class-weighted
cross-entropy plus Laya's proper-scoring reward. MPS was not used: the earlier
full inference test reached a 17.0 GiB physical footprint and heavy swap on
this 16 GiB Mac. Only category, property kind, transaction, deed, parking,
elevator, and storage decisions were trained. Usage has no independent source
target here; numeric values and city/neighborhood remain deterministic-parser
and catalog-resolver fields.

On the held-out **synthetic-template** test rows, the base-to-adapter change was:

| Decision | Base accuracy | Adapter accuracy | Base macro-F1 | Adapter macro-F1 |
| --- | ---: | ---: | ---: | ---: |
| All decisions | 59.4% | 89.8% | 44.1% mean field | 73.9% mean field |
| Category | 66.3% | 84.6% | 38.9% | 56.5% |
| Property kind | 95.3% | 97.0% | 66.2% | 66.6% |
| Transaction | 62.1% | 99.4% | 30.0% | 79.8% |
| Deed | 33.3% | 92.6% | 23.9% | 62.6% |
| Parking | 51.2% | 89.4% | 50.8% | 89.4% |
| Elevator | 44.0% | 85.7% | 43.8% | 85.5% |
| Storage | 57.9% | 79.9% | 54.8% | 76.9% |

This large lift is expected to be optimistic because labels and synthetic
templates were constructed from the same offer facts. It does not establish
accuracy on naturally written needs. There is also a concrete safety failure:
deed `unknownFalsePositiveRate` rose from 36.4% to 54.5% on this small holdout
(the answer is incorrectly left unknown when a deed type is present). Keep this
adapter research-only; do not connect it to `/post`, publish it, or describe it
as a generally improved model. The experiment artifact is
`data/laya-experiments/divar-counterfactual-v5-head-pilot-2026-09-26-run2/`;
its manifest blocks production loading and records pending rights review. A
four-row smoke with the exact Laya runtime successfully overlaid the adapter
and returned valid typed choices.

The current compact-contract v6 full inference job was safely paused during
training at 1,248/999,416 rows and has since been resumed with its existing
output and manifest. At that checkpoint, observed throughput projects roughly
11.2 days for the remaining rows and about 4.7 GB of output; this is a linear
estimate only, not a finish guarantee. The 584 rejected source rows remain
excluded. No data from another source is added, and neither model weights nor
synthetic records are redistributed.

At the latest live check after resume, the v6 manifest was `running` at
1,400/999,416 output rows (source cursor 1,401; one source row was skipped),
175 Laya calls, and 9,581,971 output bytes. The refreshed linear estimate was
about 11.1 days remaining.

### Throughput check after explicit full-corpus training approval (2026-09-26)

The v6 local run remains append-only and uses the exact Laya checkpoint on the
CPU worker at port 8101, batch size 8. At the latest checkpoint it had
2,224/999,416 rows, 278 inference calls, no skipped contact/invalid rows, and
15,310,148 output bytes. End-to-end wall throughput since the run start was
about 1,560 rows/hour, implying roughly 26.6 days for the remaining corpus if
the same rate holds. This is a live-rate extrapolation, not a completion
promise; per-model latency alone materially understates wall time.

I tested using a second local CPU worker while the main run continued. Its
16-row smoke averaged 39.9 seconds per batch of 8 versus about 8.9 seconds per
batch on the main run during the same interval. A batch-32 smoke had not
committed any row after more than three minutes and was interrupted; its
uncommitted output was not retained. Running two loaded Laya processes
increased memory and slowed the main checkpoint rate, so the temporary second
worker was stopped; the main worker and existing `/post` worker were left
running. The MPS path is not selected: prior measured MPS runs were slower and
reached 17.1 GiB physical footprint on this 16-GiB host.

The clean source manifest reports 3,576 duplicate text groups and 3,889 rows
beyond each group's first row (about 0.39% of the 999,416 clean rows). Exact
duplicate suppression cannot materially change the multi-day estimate and
would require preserving source-group split/provenance invariants.

The CPU head-only training pilot remains complete but research-only: one epoch,
8 CPU threads, 1,525 training rows, and a 169-row synthetic held-out test.
No full-corpus fine-tune has been claimed or deployed. The corpus is still
Divar-derived counterfactual data, not evidence of real seeker behavior; the
separate source-rights review remains pending.

### Later update: large synthetic-corpus head experiment started (2026-09-26)

The user authorized local-only batch processing of Divar offers into explicitly
hypothetical proposals and authorized an isolated training experiment, while
choosing Divar as the only listing source and accepting its coverage limits.
This permission does not convert offers or counterfactuals into observed user
needs. Laya predictions are not used as labels. No network listener was
observed for the running training PID at the live check; the trainer also sets
the Hugging Face and Transformers clients to offline mode.

The finalized proposal corpus contains 995,641 rows from 1,000,000 source
offers. It has 797,483 train, 99,262 calibration, and 98,896 test source groups;
the current run consumes all 797,483 training rows and uses a bounded,
category-stratified sample of 256 rows for each held-out evaluation split. It
trains only `category_candidate`, `property_kind`, and `transaction_type`
(2,392,449 decisions). The state strings are deterministic first-person
counterfactual templates, not human-authored or observed seeker requests.
Budget, monthly rent, deposit, intended business use, and other unsupported
seeker preferences remain unknown rather than being copied from offer-side
amounts or attributes.

The live experiment is
`data/laya-experiments/divar-hypothetical-needs-v1-full-head-2026-09-26/`.
Its manifest pins `convaiinnovations/laya-multilingual` at revision
`e4e9ddf21a7b1903b7acffd8814ad4307bf63a67` and records the matching base-weight
SHA-256. It freezes the multilingual encoder and trains 14,770,945 decision
head/type-embedding/scorer parameters using AdamW, one requested epoch, batch
size 8, and eight CPU threads. At 2026-09-26 22:41 local time, the live session
had saved its first adapter checkpoint at step 1,000 of 299,057, with mean
training loss 0.4909 after 1,205.9 seconds; the adapter file was 59 MB. This
proves optimizer updates occurred, but does not establish an accuracy
improvement: calibration and held-out evaluation run after the epoch. The run
remains active and the artifact is not production-loadable.

This is a bounded head-only experiment, not the official end-to-end recipe.
Laya's current upstream notebook adapts both encoder and decision head, uses
RLCD-style policy-gradient reward with soft-target cross-entropy, and fits
temperatures using a held-out calibration slice. It demonstrates the method,
but targets a different English checkpoint and dataset, so it cannot be copied
unchanged for the pinned multilingual model. The local Python environment
reports MPS built but unavailable and CUDA unavailable; this run is CPU-only.
See the [official Laya fine-tuning notebook](https://github.com/NandhaKishorM/laya/blob/main/notebooks/laya_finetune_typed_decisions_2xT4_kaggle.ipynb).

The latest Divar-to-app coverage audit finds 16 of 18 real-estate leaves,
382 of 1,207 app city catalogs, and 1,120 of 1,188 city/neighborhood pairs
matched exactly; exact neighborhood mappings occur in only 11 source cities
and cover 420,989 retained rows (42.12%). `land-rent` and `agency-services`
remain absent, and 73,941 retained rows lack a mapped app city. The 117-row
difference between raw crosswalk counts and the retained corpus still lacks
row-level omission reconciliation. These are data coverage limits, not model
failures, and the user selected no additional listing source. The current
experiment therefore does not meet the original all-city/all-leaf coverage
claim.

Completion gates remain: finish and evaluate the live run on held-out
synthetic groups; compare against its recorded baseline and simple majority;
audit per-field/class and unknown behavior; fix or explain the 117-row
crosswalk delta; and keep the model disconnected from production. The run
cannot establish real `/post` performance without independently reviewed,
consented need-text examples and a separate human-labeled holdout. Rights and
individual-content/privacy review remain pending before any redistribution.

### Update: MPS execution and neighborhood delta reconciled (2026-09-28)

The 2026-09-26 CPU run was safely interrupted by the trainer's handler at
2,000/299,057 steps; its 59 MB `interrupted-adapter.safetensors` and earlier
checkpoint remain preserved. It had no held-out accuracy result and was not
resumed. The exact training venv (`mini-services/laya-post/.venv`, PyTorch
2.14.0 arm64) was probed outside the sandbox: MPS is available and a real MPS
matrix operation succeeded. PyTorch documents this backend as mapping model
graphs to Apple's Metal Performance Shaders GPU runtime
([official MPS documentation](https://docs.pytorch.org/docs/stable/notes/mps.html)).
A 12-step run of the patched trainer then
completed on MPS against a bounded temporary sample. This verified model
forward, gradients, optimizer updates, and adapter serialization, not useful
accuracy; the tiny held-out score was unchanged. A batch-32 smoke processed 62
training rows in six steps with a measured MPS driver allocation of about 4.66
GB. Batch 64 processed 122 rows in six steps at roughly the same per-decision
rate but used about 6.77 GB, so the full run uses batch 32 for more memory
headroom. Smoke artifacts were temporary and removed. The earlier 17.1-GiB
footprint note in this document describes a separate full-model inference
service experiment; it is not the memory measurement for this head-only MPS
training path.

The full MPS experiment is now launched at
`data/laya-experiments/divar-hypothetical-needs-v1-full-head-mps-2026-09-28/`
using the pinned multilingual revision, one epoch, batch size 32, and eight
CPU threads. Its manifest reports 797,483 training rows, 2,392,449 decisions,
and `device=mps`; at the last check it was `running`, with the first 1,000-step
checkpoint not yet committed. The bounded 1,454-row calibration and 1,462-row
test samples produced a base-checkpoint test accuracy of 0.5481 and mean
per-field macro-F1 of 0.4553 over 4,386 decisions. These are proxy metrics on
synthetic source-derived targets, not seeker-intent performance. The adapter
is explicitly not production-loadable.

An earlier follow-up around 02:43 Tehran time still showed step 0. At about
02:46, the same live run wrote its first checkpoint: step 1,000/74,765,
mean training loss 0.332094, and 1,614.82 elapsed seconds. The preserved
`last-adapter.safetensors` is about 56 MB (SHA-256
`9d4802bc9365e6c17a400a40d393bd6b11fa30b9683680a232b7b9e045dbab9b`). It
reopened successfully with 31 expected head/scorer/type-embedding tensors.
The observed early average is about 0.62 steps/second; a straight-line projection
would put one epoch near 33.5 hours, but this is not an ETA and may change as
the run proceeds. A pre-checkpoint stack sample showed the main thread in
PyTorch's MPS copy/synchronization path at about 6.1 GB process footprint; the
later checkpoint proves the run was progressing, not permanently hung. No
post-training held-out evaluation exists yet; retain and monitor this same run
until it finishes, then compare against the recorded base and majority
baselines before considering any further use.

Per-field base Laya test accuracy / macro-F1 on that same sample was:
`category_candidate` 0.3906 / 0.3322, `property_kind` 0.7456 / 0.7195, and
`transaction_type` 0.5082 / 0.3143. These are the comparison values for the
post-training report; the active trainer does not yet emit a simple-majority
baseline, which remains a required independent comparison.

The 117-row neighborhood difference is now fully reconciled by
`scripts/datasets/audit-divar-neighborhood-retained-delta.py`, replaying the
builder's exact rules against the pinned 1,000,000-row Divar CSV checksum. Of
421,106 raw rows with exact neighborhood crosswalks, 420,989 remain; 116 rows
are removed by duplicate-text-group category/city conflicts (46 category, 84
city, 14 overlapping both), and one more has an unmapped category. The app
city map and neighborhood crosswalk disagree on zero rows. No listing text or
row identifiers are emitted by the audit; its temporary SQLite index is
deleted on exit. The updated notebook includes the rerunnable reconciliation
cell, but native Jupyter execution/rendering is still unverified because
`nbformat`, `nbclient`, and Jupyter are not installed in the training venv.

The main limitations remain unchanged: the corpus has 995,641 deterministic
hypothetical proposals from seller-side ads, not real seeker requests; source
rights and individual-content/privacy clearance remain pending; catalog
coverage remains 16/18 property leaves and 382/1,207 app city catalogs; and
no real-intent held-out evaluation has been established. The MPS run cannot
close those gaps or justify production use.

### Laya-conversion scope check (2026-09-28)

The separate local-Laya shadow artifact
`data/divar/divar-property-offer-structured-v1-laya-counterfactual-v6-full-2026-09-26.jsonl`
contains only 3,776 analyzed rows (472 batches of 8; about 65.7 minutes total
inference time). It is distinct from the 995,641-row deterministic training
corpus; the active training manifest explicitly says
`layaPredictionsUsedAsLabels=false`. At the latest check, the configured
shadow worker at `127.0.0.1:8101` was not listening. Therefore the user's
requested full-corpus Laya-assisted offer-to-hypothetical-need conversion is
not complete. Preserve the current MPS run; after it releases the GPU, resume
the local shadow pipeline against the pinned checkpoint, keep its output
separate and hypothetical, and do not promote its predictions to ground truth.

The prior batch-8 shadow manifest records 3,776 rows in 3,939,164.65 ms
(about 1.04 seconds/row, or a rough 288.5 hours for 995,641 rows if the rate
held). This is only a linear projection. Separate single-call MPS smoke runs
recorded about 42.9 seconds for 16 rows and 44.6 seconds for 32 rows; they are
not warmed, repeated head-to-head throughput benchmarks and do not establish
that larger batches are faster. Before launching a million-row shadow run,
benchmark repeated warmed batches with the exact conversion question set and
choose the measured best stable throughput/memory tradeoff.

### Aggregate Laya shadow evaluation (2026-09-28)

The existing aggregate-only evaluator completed over all 3,776 shadow rows.
It correctly compared Laya's offer-reading decisions only with persisted
Divar offer labels, never with the generated hypothetical need labels. Among
asked decisions, exact agreement was 570/1,827 (31.2%) for category, 1,757/3,027
(58.0%) for property kind, and 168/1,440 (11.7%) for transaction type. Decision
coverage over all rows was 48.4%, 80.2%, and 38.1%, respectively; exact matches
over the full 3,776 rows were 15.1%, 46.5%, and 4.4%. The artifact has zero
real-need training-eligible rows. Deed, usage, and amenity predictions remain
unscored because persisted offer-ground-truth labels are absent. Area (99.76%)
and room-count (98.97%) consistency only measure deterministic parsing against
facts already embedded in the generated text; they are not independent user
accuracy. Treat these results as a baseline for the supervised source-fact
experiment, not as buyer-intent accuracy or evidence that Laya-generated
proposals are safe training labels.

### Research adapter inference gate (2026-09-28)

The loopback `/post` Laya worker now has an explicit local-only adapter path.
It requires `LAYA_ALLOW_RESEARCH_ADAPTER=true`, an explicit local base snapshot,
`best-adapter.safetensors`, and a completed manifest. Before changing model
weights it checks the exact approved Laya revision and base-weight SHA-256,
research-only/synthetic manifest flags, all three trained decision fields,
the pinned Divar source and corpus hashes, selected epoch, exact trainable tensor
names/shapes/count, finite tensor values, and adapter checksum. Health reports
`adapter_mode=research_only`; this never
sets production authorization. Unit tests cover valid load plus rejection of
in-progress/production manifests, wrong base weights, non-selected artifacts,
out-of-scope tensors, non-finite values, wrong source/corpus, and tensor-count
mismatch. The local worker suite passes 15 tests. The active MPS run has not yet produced a completed
manifest or selected best adapter, so the feature is tested with isolated fake
weights and must still be validated against the real completed checkpoint.

Latest live-run check at 03:17 Tehran: the same MPS process reached step
2,000/74,765 and wrote checkpoint two; mean training loss is 0.15094 after
3,425.54 seconds. The second thousand steps took about 30.2 minutes, consistent
with the earlier rough throughput estimate. The run is still incomplete; do not
load `last-adapter` as the selected model and do not start another MPS inference
job while this process is using the shared device.

### Upstream fine-tuning method audit (2026-09-28)

I compared the active trainer with the official [Laya typed-decision fine-tuning
notebook](https://github.com/NandhaKishorM/laya/blob/main/notebooks/laya_finetune_typed_decisions_2xT4_kaggle.ipynb)
and the project's [worked fine-tuning example](https://github.com/NandhaKishorM/laya/blob/main/docs/finetune_browser_agent.md).
The standard recipe builds Laya's own typed-decision sequences, keeps calibration
examples out of optimization, trains encoder and decision head with separate
learning rates, combines soft-target cross-entropy with noisy-logit policy
gradient rewards (`proper_reward`), calibrates temperatures on held-out examples,
then evaluates on an untouched test set. The notebook's four-epoch/two-T4 setup
is an example, not a hardware-independent recipe; importantly, that notebook
trains the English `convaiinnovations/laya`, so its exact command/config cannot
be copied to this project's required multilingual checkpoint.

The active MPS job is a bounded feasibility experiment, not that full recipe:
it freezes the multilingual encoder, trains only the typed head/type embedding/
scorer for one epoch, and uses hard one-hot source-derived counterfactual labels.
It includes a held-out test partition and `proper_reward`, but has no soft gold
distributions or post-training temperature fit. Its labels describe Divar supply
offers/counterfactual templates, not observed user intent. Local runtime is
`laya==0.3.20`; upstream main currently documents 0.3.21, so the in-flight job
must stay pinned and any standards-based follow-up must first verify API and
weight compatibility instead of upgrading dependencies mid-run.

Therefore the decision gate after this run is: compare every trained field
against the exact base checkpoint on held-out source groups, class-majority
baseline, per-category and per-city slices, Brier/ECE and abstention behavior.
If it fails, retain the base model and treat the run as failed research; if it
passes only source-offer metrics, it still does not establish seeker-intent
accuracy. A separate, source-labeled Laya conversion batch remains necessary
for the user's approved hypothetical transformation workflow, and cannot be
claimed to have been completed by this supervised run.

### Separate Laya-derived proposal contract (2026-09-28)

The local batch writer now emits `layaDerivedHypotheticalNeed` beside (not in
place of) the deterministic `hypotheticalNeed` reference. It combines only
text-evidence-supported Laya typed choices (`category_candidate`,
`property_kind`, and `transaction_type`) with the already verified deterministic
area, room, amenity, deed, city, and exact-neighborhood facts. Laya still does
not generate prose; Persian request wording is assembled deterministically.
Unknown/unsupported choices and category/property/transaction contradictions
produce a structured proposal with `state: null` and an explicit conversion
status instead of plausible-looking text. A seller-side `sell` decision is not
silently rewritten as a seeker's buy request.

Every such proposal is marked synthetic, shadow-only, unaccepted,
`realNeedGroundTruth: false`, and `trainingEligible: false`. Existing corpus
finalization and training continue to consume only the separately versioned
source-fact `hypotheticalNeed.targetDecisions`; they must not train from Laya
predictions. This closes the code-path gap but does not mean a full-corpus
Laya-derived conversion has run: no new million-row inference was started while
the active MPS fine-tune holds the device. The new converter is covered by
targeted tests for compatible rendering, exact mapped location preservation,
transaction direction, property/category conflicts, unsupported choices, and
confidence validation. Full-corpus conversion still requires a measured,
resumable batch after the current training run releases MPS, then aggregate
coverage/abstention and human review; no output is suitable for production or
gold-label training meanwhile.

A read-only conversion preflight over the already-existing 3,776-row Laya
shadow artifact (no new model calls) initially rendered 239 texts under a
within-category compatibility check. Comparing those decisions against the
persisted structured offer facts showed that only 67 agreed on all three
fields. The converter was tightened to require source agreement before
rendering. Under that gate, 58/3,776 (1.5%) now render; statuses are 2,119
unsupported/unknown categories, 1,087 source-category disagreements, 229
source-transaction disagreements, 15 source-property-kind disagreements, and
268 within-category unknown/conflict cases. Across individual fields, there
were 1,087 category, 876 property-kind, and 638 transaction disagreement flags;
these overlap when one row conflicts on multiple fields. Of the 58 rendered
texts, 31 include an exact mapped neighborhood. These are conversion and
abstention counts on that older sample, not accuracy on real needs or a
projection of full-corpus coverage. The low render coverage is why the pipeline
preserves abstentions and keeps the larger run gated behind evaluation rather
than filling the million-row target with guesses.

### Generated-text split leakage and correction (2026-09-28)

A full aggregate audit of the active 995,641-row training input found 289,459
rows in repeated normalized generated-text groups (706,182 distinct texts).
49,009 duplicate groups crossed the file's original train/calibration/test
partitions, affecting 248,112 rows. The target fingerprints in those repeated
groups agreed, so this was split leakage and repeated weighting, not a detected
label conflict. The earlier held-out baseline/test metrics are therefore not
independent generalization evidence and must not be used to select or promote
an adapter. This applies to the active MPS experiment's evaluation, even though
the training process itself remains isolated and production loading is false.

The root cause was a mismatch in the grouping key: the builder collapsed
duplicates by normalized source-ad group, while the model receives a separately
generated Persian need sentence. Different source ads can therefore produce
the same actual model input and land in different original partitions.
The corpus builder is now versioned to collapse identical normalized model
inputs, quarantine the whole text group if target fingerprints disagree, and
assign a deterministic 80/10/10 split from the normalized model-input hash.
The original source split remains recorded for audit. Both trainer entrypoints
now require this corrected corpus schema and fail closed on duplicate normalized
inputs or a split/hash mismatch. The existing v1 corpus and live run are
preserved; they are not silently rewritten. A newly built v2 corpus still needs
a complete duplicate/split audit before a fresh MPS experiment can use it.

All of these examples remain Divar-supply-derived hypothetical text with
deterministic source-fact targets, not real seeker requests or human-reviewed
gold labels. The corrected split improves the integrity of synthetic
generalization checks; it does not make those checks evidence of real-user
intent accuracy or clear the pending privacy/rights review.

### Corrected v2 corpus build and validation (2026-09-28)

The deterministic builder completed from all 999,416 normalized Divar offer
fact rows. It skipped 3,541 repeated source rows, collapsed 310,656 repeated
generated states, quarantined zero conflicting state groups, and wrote 685,130
distinct normalized model inputs. The final training split is 547,706 train,
68,747 calibration, and 68,677 test. The manifest records
`exactNormalizedStateGroupsDisjoint=true` and assigns each state by
`sha256(normalized_state) first32bits % 100` into an 80/10/10 split. The final
JSONL is 2,474,972,661 bytes with SHA-256
`3ae812456595f5d82107934fd67ff0b712403c3c285e510788d733566c4c2019`.
The accepted rows cover 16 categories, 382 cities, and 1,008 neighborhoods;
this is not full coverage of the application's location/category catalogs.

The streaming trainer's `--validate-only` accepted all 685,130 rows against the
pinned `convaiinnovations/laya-multilingual` revision and verified unique
source groups, unique normalized states, split counts, question-schema hash,
and model-weight hash; it performed no model inference or training. The general
corpus-eligibility audit intentionally returned `eligibleForTraining=false` and
zero qualified rows: every row is synthetic and supply-derived, with no human
review, real seeker ground truth, or per-row consent/license evidence. Its
zero-match contact-pattern check is not a comprehensive personal-data review.
The source manifest prohibits cloud transfer and redistribution pending
privacy, attribution/share-alike, and downstream-use review. The upstream
dataset card declares ODbL, which is not by itself proof that this specific
derived model use has been reviewed or approved
([source dataset card](https://huggingface.co/datasets/divarofficial/real_estate_ads)).

The completed v2 builder did not call Laya: its Persian requests are still
deterministic counterfactual templates with source-fact labels. Full-corpus
Laya-assisted proposals have not run. The separate MPS run remains on the old
v1 input; latest observed checkpoint is step 8,000/74,765 with mean loss
−0.1061. Because v1 has cross-split normalized-text leakage, that run's held-out
metrics are invalid and the loss is not a quality measure. Preserve its
checkpoint, do not promote it, and do not start a clean MPS run until the
corrected corpus has passed duplicate/split validation. The subsequent section
records the v2 run and its research-only scope.

### Clean v2 MPS run started (2026-09-28)

The v1 MPS experiment was interrupted after step 8,000/74,765 by its
`KeyboardInterrupt` handler. Both `last-adapter.safetensors` and
`interrupted-adapter.safetensors` remain preserved; its manifest is
`interrupted`, its v1 input is unchanged, and none of its leaked-split metrics
may select or promote an adapter.

The completed v2 corpus passed the streaming trainer's `--validate-only`
contract check against the pinned local multilingual checkpoint: 685,130 rows,
685,130 unique normalized inputs/source groups, matching SHA-256 and all three
deterministic split counts. A CPU-only validation was used because sandboxed
Python reports MPS unavailable; a permission-enabled host execution then
started the real run with `--device mps` and verified baseline evaluation on
held-out v2 groups before optimization.

Baseline over source-derived hypothetical targets: calibration 14,175
decisions, accuracy 58.29%, mean-field macro-F1 47.90%; test 14,118 decisions,
accuracy 58.27%, mean-field macro-F1 47.51%. These are comparison baselines for
the same synthetic task only, not real-user need accuracy. The active run uses
547,706 train rows / 1,643,118 typed decisions, one epoch, batch size 32,
learning rate 5e-5, eight CPU threads, and MPS. It trains only category,
property-kind, and transaction-type heads; city/neighborhood, numeric
preferences, and usage remain outside this adapter. Production loading remains
false. At launch, the process wrote a `running` manifest and step-zero progress;
its first adapter checkpoint is scheduled at 1,000 steps. Full Laya-assisted
Divar conversion remains a separate, incomplete local batch and these metrics
do not complete that requirement.

Live follow-up (2026-09-28, 07:22 Asia/Tehran): the same host process remained
active on MPS and wrote `last-adapter.safetensors` at step 1,000/51,348. The
checkpoint records mean loss 0.26456 after 1,632.65 seconds of training; its
SHA-256 is `db2de9e2a9c91ea7dcf30a9d63d8574893a1fd1831aff591e1b7e76b2fe6b09c`
and its size is 59,086,748 bytes. The run manifest remains `running`; this is
an intermediate checkpoint, not a selected or evaluated adapter. The loss
measures optimization against synthetic source-fact targets only.

A fresh aggregate coverage audit against the current app catalog found 18
app property leaves versus 16 source categories (`agency-services` and
`land-rent` are absent), 382 mapped app cities among 1,207 catalogs (31.65%
of app catalogs), and 1,120 exact neighborhood pairs among 1,188 source pairs
(94.28%). Despite high pair-level match coverage, only 420,989/999,416
normalized offers (42.12%) carry an exact mapped app neighborhood. These are
Divar-source coverage measures, not coverage of real seeker behavior.

The post-run comparison is prepared in
`scripts/datasets/finetune/evaluate-divar-laya-adapter.py`. It refuses an
incomplete run, verifies the exact base weights, data hash, corrected split,
question contract, and adapter tensor scope, then compares the base model and
selected adapter on the test split. Temperature fitting uses only calibration
rows; the report includes the global training-majority baseline, Brier score,
ECE, unknown handling, and category/city slices. By default it scans the full
held-out test partition and does not overwrite an existing report. Its unit
checks and Python compilation pass. Do not launch it until the active MPS
training process exits, and do not interpret synthetic-target scores as real
seeker-intent accuracy.

Live follow-up (2026-09-28, 07:50 Asia/Tehran): the same host training session
remained active and wrote checkpoint step 2,000/51,348. Reported mean loss is
0.1030667 after 3,266.05 seconds of training. This remains an intermediate
checkpoint; no calibration selection, held-out adapter comparison, or real-need
accuracy claim is available yet. The MPS process is not sharing its device with
inference.

The fresh coverage audit also found 32 unresolved Tehran neighborhood entries
whose Divar district names end in the legacy label `قدیمی` and, after removing
only that suffix, match exactly one current app-catalog neighborhood name.
Together these source pairs account for 9,282 rows (0.93% of normalized offers).
They are not silently reclassified as exact official matches: this is an alias
candidate, not a current Divar district-ID match, and the active v2 training
input/hash remains unchanged. Of the other unresolved neighborhood pairs,
30 have no district metadata in the current Divar API snapshot and six map to
non-unique app-catalog names. Any follow-up may use the 32 unique matches only
as a clearly recorded, city-scoped alias proposal unless a stronger source
proves canonical equivalence.

The local research-adapter allowlist was corrected to pin the active v2 JSONL
SHA-256 (`3ae812456595f5d82107934fd67ff0b712403c3c285e510788d733566c4c2019`)
instead of the previous v1 hash; a regression test explicitly rejects v1.
All 16 private-worker tests pass. The explicit research opt-in, exact base
checkpoint validation, complete-run requirement, and `productionLoadAllowed: false`
gate are unchanged.

City coverage follow-up (2026-09-28): the corpus builder now optionally checks
Divar's pinned local location tree when recovering excluded city aliases. A
mapping is admitted only with a unique numeric ID in the tree, exact source
slug, a unique existing app catalog candidate, and exact normalized Persian
city-name equality; this deliberately rejects `بندر ماهشهر` → `ماهشهر` and
duplicate tree identities. Three regression tests cover exact recovery and
both rejection cases; all 16 corpus-builder tests pass. Re-running the mapping
against the one-million-row local CSV adds 14 source slugs and 40,031 raw rows,
raising source-city coverage from 925,664/1,000,000 (92.57%) to
965,474/1,000,000 (96.55%). This is a future-build improvement only: the active
v2 corpus, its SHA-256, and the MPS run input were not modified. Exact-name
mapping still does not imply license/privacy clearance or real seeker-demand
coverage.

Pipeline correction and model gate (2026-09-28): the earlier v2 MPS run was
stopped at step 2,000/51,348 after verifying that its inputs were deterministic
counterfactual templates and it did not perform the user-requested Laya batch
conversion. The trainer handled SIGINT, set the run manifest to `interrupted`,
and preserved both the last checkpoint and `interrupted-adapter.safetensors`
(59,086,748 bytes); no adapter was selected or promoted. The exact pinned base
Laya worker then loaded locally on MPS with network offline. A 32-ad run against
the v3 city-mapped corpus completed in 40,698 ms and rendered only 1/32 Laya-
compatible proposals; source agreement was 5/32 for category, 10/32 for property
kind, and 2/32 for transaction. This is a smoke result, not a benchmark claim.
The million-row inference was not launched because the measured throughput and
agreement make that run wasteful and low quality. The follow-up sequence is to
train the typed head on the clean source-fact-labeled hypothetical-request
corpus using MPS, re-evaluate the same conversion gate, and only then decide
whether the full local Laya batch meets the quality bar. This ordering does not
turn any synthetic or seller-side data into real seeker ground truth.

### v3 exact-city corpus and MPS training (2026-09-28)

The v3 counterfactual corpus was finalized at 723,080 unique normalized
synthetic states from 999,416 retained source offers. It excludes 3,541 exact
source-text duplicates, quarantines 234 conflicting source groups (298 source
rows), and collapses 272,561 duplicate generated states. The manifest records
zero structurally invalid proposal rows before those deduplication/quarantine
steps. The train/calibration/test split is 578,742 / 72,272 / 72,066 and exact
normalized states are disjoint.
The corpus manifest explicitly records `synthetic: true`,
`realNeedGroundTruth: false`, `trainingEligible: false`, and
`layaPredictionsUsedAsLabels: false`; it is a research training artifact, not
user-provided need data.

Category skew is material in the active training split: `apartment-sale` has
176,987 rows (30.58%), while `workspace-short-rent` has 436 (0.075%); the
source has no examples for `land-rent` or `agency-services`. The trainer uses
square-root inverse-frequency weights capped at 5, which raises the
`workspace-short-rent` weighted share only to about 0.13%. This can leave tail
categories underfit even when overall metrics improve. Preserve the current
run, then inspect per-category precision/recall and confusion on its held-out
split; any reweighting experiment must use a separate research run and still
cannot establish real-seeker accuracy from these synthetic labels.

The full-run base-model evaluation is already persisted in
`data/laya-experiments/divar-hypothetical-needs-v3-mps-full-2026-09-28/baseline-metrics.json`.
On its 512-example category-stratified test sample (1,536 typed decisions),
the unadapted model scored 39.06% accuracy / 0.329 macro-F1 for category,
75.39% / 0.742 for property kind, and 48.44% / 0.310 for transaction type;
all decisions combined were 54.30% accurate. This is the comparison baseline
for the selected adapter, not real-user accuracy. The bounded sample has zero
support for `land-rent` and `agency-services`, which also have no source rows;
their behavior cannot be validated from this Divar-only run.
Within the 32 examples available per represented category in this sample, the
base model had zero recall for `industrial-rent`, `industrial-sale`, and
`suite-apartment-rent`; `land-sale` and `office-sale` each had 6.25% recall.
Post-training comparisons must report this class-level movement, not only the
aggregate accuracy.

Coverage was re-audited against the live application catalogs using the v3
source manifest. Divar has 421 source cities, 395 exactly mapped to the app
(93.82% of source-city identities); those mappings cover 964,902/999,416
normalized offer rows (96.55%). The app has 1,207 city catalogs, so source
coverage reaches 32.73% of app catalogs. Of 1,188 source city/neighborhood
pairs, 1,120 have exact app-catalog matches (94.28%), but only 420,989 offers
(42.12%) carry a mapped neighborhood. 68 pairs remain unresolved. The raw
crosswalk-to-retained-manifest delta is 117 rows, bounded by 584 normalizer
omissions; aggregate data do not prove row-level omission reasons. Sixteen of
18 app property leaves occur in this Divar source; `land-rent` and
`agency-services` have no source examples and are not synthesized as if they
were real. These limitations prevent a claim of complete city/category/
neighborhood coverage from the Divar-only source.

Exact audit of the 26 unmapped source-city identities (2026-09-28): each slug
resolves to one Divar numeric city ID and one official location-tree record,
but none has an existing application city catalog under its source slug,
official slug, or second slug. Together they account for 34,512 retained fact
rows; two additional fact rows have no source city slug. These are application
catalog coverage gaps, not ambiguous Divar identities, and were not force-mapped
to a neighboring or similarly named city. Adding these cities requires an
authoritative app catalog, which the Divar-only source does not supply.

Among the 68 unresolved pairs, 32 legacy district names ending in `قدیمی`
strip to exactly one same-city app-catalog name. They remain alias candidates,
not canonical matches: the current Divar district API does not provide an
authoritative ID/equivalence for them, so the training corpus does not silently
promote them.

Two 1,024-row MPS pilot runs tested batch sizes 32 and 64 on identical
category-stratified train/calibration/test selection (512 held-out examples per
split). Batch 32 was selected: test accuracy changed from 39.06% to 41.41% for
category, 75.39% to 75.59% for property kind, and 48.44% to 53.91% for
transaction type. Batch 64 had nearly identical wall time but lower aggregate
test accuracy (55.73% vs 56.97% for batch 32). These are synthetic-template
generalization results only and do not demonstrate accuracy on real seeker
requests. The selected pilot adapter remains research-only and production
loading is disabled.

The full v3 MPS run is now active at
`data/laya-experiments/divar-hypothetical-needs-v3-mps-full-2026-09-28` with
578,742 train rows / 1,736,226 typed decisions, one epoch, batch 32, 54,258
steps, learning rate 5e-5, eight CPU threads, and the exact pinned
`convaiinnovations/laya-multilingual` checkpoint. It updates the typed head,
question-type embedding, and scorer while keeping the encoder frozen; this is
not full-model fine-tuning. Checkpoints are saved every 1,000 steps. The run
manifest is marked research-only, synthetic-only, and production-load-disabled.
The manifest's exact `trainingFields` are `category_candidate`, `property_kind`,
and `transaction_type`. City and neighborhood appear in some generated input
texts, but they are not supervised output fields in this run; nor are area,
rooms, deed type, amenities, or budget. Consequently this experiment cannot be
described as fine-tuning Laya for all city/neighborhood catalogs. Exact location
resolution remains a separate deterministic resolver task and needs its own
city-scoped held-out evaluation.
After completion, the separate evaluator must compare base and selected
adapter on held-out synthetic rows by category/city and calibration metrics;
then a fresh Laya conversion benchmark on original offer text is required
before deciding whether any large Divar inference batch is worth running.

Live checkpoint (2026-09-28): the v3 full MPS process reached step 2,000/54,258
with mean loss 0.1310045719 after 3,320.15 seconds of training. The preserved
`last-adapter.safetensors` is 59,086,748 bytes with SHA-256
`2ea512610c4ff835054d1d2914532af9d27078124db4741d9879f67cb4798ab6`. The
manifest is still `running`; this is an intermediate checkpoint, not a selected
adapter or evidence of real-user accuracy. At the observed pace, the remaining
training is roughly 24.1 hours, subject to throughput variation.

Location regression follow-up (2026-09-28): the `/post` analysis adapter was
still reading `ParsedIntent.entities.area` for a neighborhood label after the
resolver had separated `entities.neighborhood` from numeric area. That dropped
resolved labels from the output even when a city-scoped slug had been found.
The adapter now reads the neighborhood field. Candidate ranking prefers a
unique exact neighborhood name over unrelated substring collisions and a unique
exact sub-area over longer partial matches, while retaining ambiguity for
similarly named neighborhoods such as `فردوسی` / `طوس فردوسی`. Exact token
boundaries prevent `ونک` from matching `پونک`, while the exact `ونک` catalog
entry still resolves. The estate matrix improved from 55/62 to 63/63, including
the reported `فرامرزعباسی` and `فردوسی بین ثمانه و مهدی` forms;
neighborhood-disambiguation and location-priority self-tests pass, and the
post-pipeline suite passes 153/153 scenarios (~1,224 assertions). City
resolution remains rules/catalog-based, not trained by the active Laya run.
PostgreSQL/Docker was unavailable during these self-tests; they used the local
catalog fallback and do not verify DB-backed runtime behavior.

The private worker's research-adapter allowlist and README were advanced from
the obsolete v2 corpus hash to the exact v3 corpus hash above. Its tests now
explicitly reject both v1 and v2 artifacts; all 17 worker tests pass. The
loader still requires a completed run, `best-adapter.safetensors`, the pinned
base checkpoint, research opt-in, and `productionLoadAllowed: false`, so the
current running/last checkpoint cannot be loaded or promoted.

Training/source review update (2026-09-28): revalidated the active v3 run via
its live shell session and manifests. The MPS run is at step 3,000/54,258,
mean loss 0.04026, with 578,742 training rows (1,736,226 typed decisions),
batch 32, eight CPU threads, and 14,770,945 trainable head/type/scorer
parameters. A permission-enabled probe of the exact project venv reports
PyTorch 2.14.0, `mps_built=true`, `mps_available=true`, and CUDA unavailable;
the sandbox-only probe reports MPS unavailable and must not be used to
contradict the running process. Based on elapsed training time, the remaining
runtime is roughly one day, not a completion guarantee. Full held-out
evaluation is available in `evaluate-divar-laya-adapter.py` with its default
`--test-row-limit 0`; use it only after the run has completed and selected an
adapter.

The authoritative Hugging Face card for `divarofficial/real_estate_ads`
declares ODbL. Open Data Commons describes attribution and share-alike duties,
including for some public uses of produced works from an adapted database;
this does not settle whether trained model weights are covered. The current
dataset manifest therefore remains local-only, disallows cloud transfer and
redistribution, and keeps rights/privacy review pending. Contact-pattern
redaction alone is not a complete privacy review: names and indirect
identifiers remain an explicit review gate. Do not publish the corpus or
adapter pending qualified review.

The official Laya fine-tuning notebook was read from upstream. It trains the
different checkpoint `convaiinnovations/laya` on `LocalLLaMA/typed-decisions`
with the encoder and head unfrozen on 2x NVIDIA T4 GPUs; it is not a ready-made
recipe for the required `convaiinnovations/laya-multilingual` checkpoint or a
single M1 Pro. The current MPS run deliberately uses the exact multilingual
checkpoint but freezes its encoder and trains only typed-decision components.
Treat it as a custom research adaptation, not the upstream full-model recipe.
The present 3,000-step loss is an optimization signal only. The corpus remains
deterministically templated, Divar-supply-derived hypothetical text with
counterfactual labels; it is neither Laya-generated natural language nor
ground truth for real seeker intent. Its 723,080 unique states cover 16/18
application leaves; 395/421 source cities map to the app, and exact mapped
neighborhoods are present on 420,989/999,416 retained fact rows. No
performance claim on real user requests is supported by this run.

Verification follow-up (2026-09-28 07:29 UTC): the original training shell
session is still live; manifest remains `running` at step 3,000/54,258, with
the 3,000-step checkpoint written at 10:46 Tehran time. No newer checkpoint
was expected yet at the observed checkpoint cadence, so the run was preserved
without restart. `test_train_divar_laya_head_stream.py` passes all 14 checks;
`test_evaluate_divar_laya_adapter.py` passes its metric, grouping, majority,
and completion-gate checks. These validate trainer/evaluator guards, not
trained-model quality.

Process liveness check (2026-09-28 07:33 UTC): the existing training session
still resolves to Python PID 56641, running the exact pinned
`train-divar-laya-head-stream.py` command with `--device mps`; its child is
`caffeinate -i`, so idle sleep is inhibited while training is active. At this
observation the process had elapsed 1:43:14 and accumulated 8:35.63 CPU time
(7.4% average CPU); this supports active work but is not a GPU-utilization
measurement. The 3,000-step checkpoint was about 16 minutes old, within the
observed ~28-minute/1,000-step cadence, so no restart or concurrent training
was warranted.

Checkpoint progress update (2026-09-28 11:14 +0330): the same live MPS session
emitted epoch 1/1, step 4,000/54,258, mean loss -0.01265; both
`training-progress.json` and `last-adapter.safetensors` were updated at
11:13:47 +0330. This is 7.37% of the requested epoch and is consistent with
the observed roughly 27–28 minutes per 1,000 steps. The combined objective can
produce a negative mean loss; this is an optimization signal, not an accuracy
result. GPU utilization remains unmeasured. The run was left untouched; held-out
evaluation still waits for completion and selection of an adapter.

Divar/app coverage re-audit (2026-09-28 11:17 +0330), using the repository's
read-only `audit-divar-app-coverage.ts`: 1,000,000 source rows reconcile to
999,416 normalized offers (583 conflicting rows and one unmapped category
skipped); 395/421 source city identities map to the app and those mappings
cover 964,902/999,416 offers (96.55%). The app currently has 1,207 city
catalogs, so the source's mapped cities cover 32.73% of app catalogs. Exact
neighborhood matching covers 1,120/1,188 source city-neighborhood pairs
(94.28%), but only 420,989/999,416 retained offers (42.12%). The 68 unresolved
pairs comprise 30 whose district slug is absent from the current Divar API, 32
without an exact app-catalog name, and six ambiguous app names. The raw
crosswalk has 117 exact-matched rows not present in the retained corpus; this
fits within the 584 skipped rows, but aggregate manifests cannot identify
which skipped rows explain the delta. Only 16/18 app property leaves occur in
this Divar source; `agency-services` and `land-rent` have no source examples.
Do not force-match unresolved locations or fabricate missing category examples;
next coverage work must use exact Divar identities and app catalogs, and report
source-limited gaps rather than claiming all-city/all-category coverage.

Legacy neighborhood alias candidate check (2026-09-28): all 32 Tehran pairs
classified as `no-exact-app-catalog-name` have a Divar display name ending in
the explicit suffix `قدیمی`. Removing only that terminal suffix yields one
exact normalized name in the same Tehran app catalog for every pair, covering
9,282 source rows. The 30 missing-current-API-slug pairs cover 6,003 rows and
the six genuinely ambiguous app-name pairs cover 748 rows. The suffix result is
a deterministic, city-local alias candidate, not an official district-ID
match; it is not included in the active training corpus. Before using it in a
new corpus, retain separate provenance (`legacy-suffix alias`), confirm the
area semantics against available Divar metadata, and keep unresolved or
ambiguous cases out rather than inflating exact-match coverage.

Alias-resolution implementation follow-up (2026-09-28): the candidate rule was
implemented and tested rather than merged into the exact-only count. All 32
Tehran pairs have official Divar district IDs; a new versioned artifact,
`official-neighborhood-app-crosswalk-2026-09-28-legacy-aliases.json`, records
the unique same-city name matches as `legacy_alias` with explicit suffix and
source provenance. Exact matches remain 1,120; the separate 32 aliases raise
combined pair coverage to 1,152/1,188 (96.97%). The remaining 36 pairs are 30
district slugs absent from the current Divar API (6,003 source rows) and six
ambiguous app-name pairs (748 rows). The corpus loader preserves
`legacy_suffix_alias` separately from `exact_official_crosswalk`. Regression
checks passed: crosswalk builder 2, corpus 17, and coverage audit 10. The active
v3 corpus and MPS checkpoint still use the exact-only crosswalk; those 9,282
raw alias rows have not been rebuilt into training input, and the retained-row
count is unknown from aggregate manifests. Human review remains false, so these
are not presented as exact official-name matches.

MPS checkpoint progress (2026-09-28 11:42 +0330): the same live session emitted
epoch 1/1, step 5,000/54,258, mean loss -0.04837, with 8,297 seconds elapsed;
`training-progress.json` and `last-adapter.safetensors` were updated at
11:41:25 +0330. This is 9.21% of the epoch. The loss remains only an optimizer
signal, not an accuracy result. The active run continues on its pinned exact-
only v3 corpus; the new legacy-alias crosswalk applies only to a future corpus
build. No concurrent inference or run restart was performed.

Exact city-catalog alias follow-up (2026-09-28): the 26 non-empty source city
slugs previously left unmapped were compared to Divar's numeric city IDs and
unique official location-tree records. Two source slugs have exact, globally
unique Persian-name matches in the app catalogs despite different Latin
catalog slugs: `shahrud` (Divar city ID 707, `شاهرود`) → `shahrood`, and
`saman-city` (ID 1833, `سامان`) → `samman`. The city resolver now permits this
fallback only when the official source ID and slug resolve to one location-tree
record, neither official catalog slug is present, and the normalized Persian
name matches exactly one app catalog city. If an official slug resolves to a
catalog with a conflicting name, or the Persian name is duplicated, the source
stays unmapped. No transliteration, fuzzy match, or manual guess is involved.
The full one-million-row raw source scan now resolves 397/421 non-empty city
identities and 967,700/1,000,000 raw offers (96.77%), versus 395 cities and
965,474 raw offers under the preceding mapping. The two new city aliases
account for 2,226 raw offers. Separately, the existing facts manifest still
reports 964,902 normalized retained rows with an app city; it was not rebuilt,
so its count must not be compared directly to the raw CSV scan. The other 24
source cities (32,298 raw offers) still lack a safe exact app-catalog mapping.
An identity audit of those 24 found a unique Divar numeric ID and official
location-tree slug/name for each, but zero exact Persian-name matches among the
1,207 app city catalogs and no catalog for the official slug/second-slug. The
five largest gaps are Pardis (11,396 rows), Parand (9,624), Qarchak (3,288),
Golbahar (2,673), and Shahr-e Rey (952). These are absent app city catalogs,
not unresolved transliterations; mapping them to Tehran or a nearby city would
be an unsupported geographic substitution.
The reproducible full-source report is generated by
`python3 scripts/datasets/audit-divar-city-coverage.py`; its summary separates
city-identity coverage from raw-offer coverage and lists every unresolved city.
The combined corpus, crosswalk, and audit suites pass 24/24 tests, including
unique-name acceptance and ambiguous-name rejection. This changes mapping
logic for a future corpus build only; it has not altered the pinned v3 data or
active MPS run, and the model is not trained to predict city.

Pre-training held-out baseline review (2026-09-28):
`baseline-metrics.json` covers 512 synthetic held-out examples per field
(1,536 decisions total). Before the active run, test accuracy is 39.06% for
category, 75.39% for property kind, and 48.44% for transaction type; mean
field macro-F1 is 0.4605 and overall decision accuracy is 54.30%. Test support
is zero for `land-rent`, `sell`, `rent_rahn_ejare`, and `rent_rahn_full`, so
those values cannot be learned or evaluated from this split. This is a weak
synthetic-template baseline, not an estimate of real-user accuracy. Compare
against the exact same held-out split after training; if critical-field gains
or class support remain inadequate, do not promote the adapter and rebuild the
dataset/targets before another training run.

Training-corpus grain audit (2026-09-28): the active v3 manifest starts from
999,416 normalized offer-fact rows and builds 999,416 deterministic
counterfactual proposals, but the final model-input corpus contains 723,080
unique normalized template states (72.35% of the fact rows). It collapsed
272,561 rows whose rendered state was identical, skipped 3,541 repeated source
rows, and quarantined 234 conflicting source groups; no invalid proposal rows
were skipped. The 723,080 states split into 578,742 train, 72,272 calibration,
and 72,066 test rows. Each output row remains `synthetic=true`,
`realNeedGroundTruth=false`, `trainingEligible=false`; the generation method is
deterministic counterfactual templating and `layaPredictionsUsedAsLabels=false`.
Thus the active run does not meet a requirement for one million distinct,
natural-language, Laya-derived real-estate needs. Repeating rows would not
repair that gap; a future corpus needs additional non-duplicative text grounded
in the allowed source, explicit Laya decision provenance, and held-out tests
that measure generalization beyond the templates.

Training heartbeat check (2026-09-28 12:12 +0330): the existing MPS session
advanced to step 6,000/54,258 (11.06%) and saved
`data/laya-experiments/divar-hypothetical-needs-v3-mps-full-2026-09-28/last-adapter.safetensors`
at 12:11:55 +0330. The latest progress record reports mean loss -0.0729264
and elapsed time 10,126.5 seconds. The same session was polled; it was not
restarted. This confirms new checkpoint activity, but MPS utilization and
real-user accuracy remain unmeasured.

Laya-derived conversion audit (2026-09-28): a separate local shadow runner can
inspect original Divar offer text with the pinned Laya model and emit a
separately marked hypothetical proposal only when its typed choices agree with
source facts. It does not generate prose; Persian request text is rendered
deterministically, and prices/rents are not reinterpreted as seeker budgets.
The existing all-source v5 and v6 attempts are interrupted at 1,872 and 3,776
rows respectively; the completed Laya shadow pilot is 389 rows. Therefore no
full-source Laya-derived conversion has completed. The active 54,258-step MPS
run instead trains from the 723,080-state deterministic-template corpus and
does not use Laya predictions as targets. The next full local conversion must
remain a separate, non-gold proposal artifact and must not be described as
verified real demand.

Laya-derived MPS smoke quality gate (2026-09-28): the completed 32-row v3
proposal smoke produced one fully renderable Laya-derived hypothetical request
(1/32). After the text-evidence guard, Laya decisions were retained for
category 13/32, property kind 26/32, and transaction type 11/32. Exact agreement
with the corresponding structured offer/counterfactual facts was 5/32 (15.6%),
10/32 (31.2%), and 2/32 (6.2%) respectively; among retained decisions those
rates were 38.5%, 38.5%, and 18.2%. This is a small, source-side proxy check,
not seeker-intent accuracy. It shows that current Laya-derived conversion has
low usable yield and weak agreement; do not scale it into training labels.
Investigate question semantics, model confidence/calibration, and source-side
task alignment before the full batch conversion.

Counterfactual transaction-label correction (2026-09-28): the active v3/v5
training corpus derives long-term rental transaction labels from category
suffix alone, so its 723,080 model-input rows contain no `rent_rahn_full` or
`rent_rahn_ejare` transaction examples. A versioned v6 builder now preserves
those modes only when the audited structured offer fact explicitly supports
them; missing or incompatible evidence maps to `unknown`, and the text is
rendered with matching, non-specific wording. Seller rent/deposit amounts are
still excluded from seeker constraints. This is a counterfactual training
proposal, not evidence of real-user preference. The v6 builder and trainer
contract tests pass. A separate full v6 corpus build is now in progress using
two local workers; at the 13:17 check it had emitted 200,000/999,416 proposal
rows with no skips. These are temporary worker parts, not a finalized corpus;
deduplication, conflict quarantine, manifest validation, and training
validation remain pending. It does not overwrite the pinned v3 data.

Training heartbeat (2026-09-28 13:17 +0330): the existing v3 MPS session
reached 8,000/54,258 steps (14.74%), with mean loss -0.107829 and 13,985
elapsed seconds. `last-adapter.safetensors` was updated at 13:16:12 +0330.
The last 1,000 steps took about 33.4 minutes; if sustained, roughly 25.8 hours
remain, only an estimate. The manifest records `device=mps`. System memory
pressure reported 44% free of 16 GiB at the latest check; actual MPS utilization
is unavailable, so maximum hardware utilization is not established.

City-scoped location resolver spot check (2026-09-28): using the current local
Mashhad catalog, exact resolver tests map `فرامرزعباسی` to `شهید فرامرز عباسی`
and `فردوسی` to `فردوسی`; the Tehran catalog maps `ونک` to `ونک`. Existing
intake-location-priority and neighborhood-disambiguation self-tests pass,
including Ferdowsi/Behraman ambiguity scenarios. This verifies deterministic
catalog behavior only; it is not evidence that Laya was trained on locations.

Training and v6 build heartbeat (2026-09-28 14:05 +0330): the preserved v3
training process reached step 9,000/54,258 (16.59%); mean training loss is
-0.120968 and elapsed time is 16,037.9 seconds. The checkpoint was written at
13:50:25 +0330. The new 1,000-step interval was about 34 minutes; remaining
time at that rate is roughly 25.6 hours and is only an estimate. The two-worker
v6 build had emitted 891,940/999,416 hypothetical rows with zero skips; its
part files are not yet merged, deduplicated, or validated. The current v3
training fields remain only category, property kind, and transaction type;
location is not being fine-tuned by this run.

Evaluation runtime caveat (2026-09-28 14:05 +0330): system Python cannot import
Laya. The service venv imports Laya 0.3.20 and Torch 2.14.0, but a fresh shell
reports MPS built yet unavailable. The already-running training session has
successfully written its step-9,000 checkpoint under the run manifest's MPS
device setting, so the two observations refer to different runtime contexts
and actual GPU utilization remains unmeasured. The first evaluator attempt
used system Python and failed before loading data; no evaluation result was
produced. The guarded evaluator also intentionally requires a completed run,
so no in-progress checkpoint was mislabeled as a final evaluation.

Completed v6 corpus quality check (2026-09-28 14:17 +0330): the builder read
999,416 eligible source rows and emitted 738,109 unique, schema-valid
hypothetical examples. Reconciliation is: 3,541 duplicate source rows skipped;
254 conflicting source groups (319 conflicting duplicate rows) quarantined;
257,512 repeated normalized states collapsed; zero conflicting normalized
state groups; 738,109 output rows. The trainer's full-corpus `--validate-only`
pass succeeded on every output row, with 591,107 train, 73,333 calibration,
and 73,669 test rows; it performed no training. This is deduplication and
contract validation, not human quality review or real-user ground truth. The
manifest correctly keeps `synthetic=true`, `realNeedGroundTruth=false`,
`humanReviewed=false`, `layaPredictionsUsedAsLabels=false`, and
`trainingEligible=false`.

The v6 transaction targets now include 423,102 `buy`, 229,722
`rent_rahn_ejare`, 52,902 `rent_rahn_full`, 25,642 `rent_short_term`, 2,941
`rent_monthly`, and 3,800 `unknown` examples. Sixteen of eighteen supported
category leaves occur in this Divar-only corpus. It contains 395 known mapped
city IDs; 12,378 rows (1.68%) have unknown city. Of the unique examples,
379,915 (51.47%) have no resolvable neighborhood and remain unknown for that
field. The Laya training contract still covers only category, property kind,
and transaction type; city/neighborhood are not fine-tuned. These coverage
gaps are retained rather than filled with fabricated labels.

Training heartbeat (2026-09-28 14:25 +0330): the preserved v3 MPS run reached
10,000/54,258 steps (18.43%), mean training loss -0.131207, elapsed
18,095.6 seconds. The latest checkpoint was written at 14:24:42 +0330; the
9,000-to-10,000 interval was 2,057.7 seconds. At that recent rate, about
25.3 hours remain, a rough estimate only. This is training-set loss on the
older v3 synthetic target semantics, not held-out or real-user accuracy; keep
the resulting adapter research-only and do not load it in production.

Current training/queue recheck (2026-09-28 20:38 +0330): the single v3 MPS
trainer (PID 56641) is still alive at 22,000/54,258 steps (40.55%), with
mean training loss -0.187777 and 40,164.6 elapsed seconds. Its progress file
was updated at 20:32:33 +0330. This confirms the run is advancing; it does not
measure MPS utilization or held-out accuracy. CPU-only RLCD trainer checks
pass. No second MPS job has been started.

The v6 launch plan remains `queued_waiting_for_v3` and its watcher (PID 87995)
will refuse to overlap v3. It requires v3 to finish successfully, produce a
complete final evaluation/checkpoint, and exit before running a bounded MPS
pilot; only a passing pilot can advance to its one-epoch full-parameter RLCD
run. v6 has 738,109 hypothetical Divar-derived rows and trains only category,
property kind, and transaction type. The downstream v7 plan is a held-out
neighborhood benchmark after v6, not location fine-tuning. Neither plan is
production eligible.

Coverage/meaning remain hard limits: the source contains 999,416 retained
Divar property offers, not authentic seeker requests. v6 has 16/18 supported
category leaves; the streaming source audit found only 397/1,207 app city
catalogs represented and 430,268/999,416 source rows (43.05%) with a mapped
neighborhood. v6's deduplicated corpus has 379,915/738,109 rows without a
resolvable neighborhood. No city or neighborhood decision is trained by v3 or
v6. All generated need-like wording is hypothetical/counterfactual; source
offer facts are not user-intent ground truth, and a low-yield Laya conversion
smoke (1/32 rows usable after evidence checks) is not safe to scale into labels.
Therefore, do not report the million-example real-needs objective as complete,
and do not promote these adapters to `/post`.

Upstream version/method check (2026-09-28): the local service environment pins
Laya 0.3.20, which matches the latest tagged release (v0.3.20); the repository
main branch's 0.3.21 metadata is newer development state, not a released
version requirement. The official project describes typed, non-autoregressive
choice/score/noul decisions rather than generated prose and documents a
proper-scoring-rule RLCD fine-tuning path. This verifies implementation-method
alignment only; upstream benchmark performance is not evidence of Persian
real-estate accuracy. References: [Laya README](https://github.com/NandhaKishorM/laya),
[official fine-tuning notebook](https://github.com/NandhaKishorM/laya/blob/main/notebooks/laya_finetune_typed_decisions_2xT4_kaggle.ipynb),
[evaluation protocol](https://github.com/NandhaKishorM/laya/blob/main/docs/evals.md),
[tagged releases](https://github.com/NandhaKishorM/laya/releases).

Location abstention stage preparation (2026-09-28 21:26 +0330): a new
local-only, city-scoped choice corpus was built from the pinned Divar exact
current-city-map facts snapshot. It contains 10,920 rows (SHA-256
`db8a97c0da18a78d3307aab6989a0b57759a994ee077fb54d56596d0e463c94a`):
9,580 weak positive text-grounded candidate choices and 1,340 weak `unknown`
choices, split 8,093/1,408/1,419 across train/calibration/test. Full corpus
validation verified every row, immutable source/data hashes, unique source
groups, and representation of both positive and unknown classes in every
split. The builder excluded 80 conflicting/cross-split groups and rejected
8,643 apparent positives whose exact target was not among the bounded
city-scoped candidates; these exclusions were not force-labeled. Coverage is
only 11 source cities: Isfahan 2,223, Mashhad 1,920, Shiraz 1,506, Karaj
1,380, Tehran 3,037, Ahvaz 578, Qom 78, Rasht 153, Bandar Anzali 12, Lahijan
15, Talesh 18. This is not broad all-city coverage. `unknown` means the
deterministic resolver found no catalog candidate in this text, not a
human-verified absence. All rows are Divar seller/agent supply text, remain
weak labels, and have `realNeedGroundTruth=false`, `humanReviewed=false`,
`trainingEligible=false`, and `cloudTransferAllowed=false`.

Per-city label audit further shows that only 9/11 cities have any positive
target labels; Lahijan and Talesh contribute only `unknown` examples. The
corpus contains 640 distinct positive city-neighborhood target pairs across
those nine cities (Ahvaz 20, Bandar Anzali 3, Isfahan 105, Karaj 51, Mashhad
83, Qom 8, Rasht 16, Shiraz 116, Tehran 238). Candidate distractors expose
additional labels but are not positive evidence. This makes the experiment a
narrow abstention/candidate-ranking test, not coverage of every city or every
neighborhood in the app catalog.

The new v8 neighborhood RLCD trainer/queue has CPU contract tests for pinned
source provenance, bounded candidate sets, no split leakage, unknown-class
coverage, deterministic positive+unknown pilot sampling, per-city and
candidate-count slices, abstention precision/recall, and calibration. It
tokenizes per batch rather than retaining all tokenized text in memory. The
launch plan pins the corpus hash, 11-city coverage, Laya revision, and single
MPS gate. Its live watcher is waiting for v7; dry-run confirmed it does not
allocate MPS while v7 is queued behind v6. The latest observed v3 checkpoint
is now 24,000/54,258 steps (progress file mtime 21:30:39 +0330); v6
still reports `queued_waiting_for_v3`, v7 `queued_waiting_for_v6`, and v8
`queued_waiting_for_v7`. No v8 model has been trained and no location accuracy,
latency, or MPS memory result is claimed. Python trainer/queue/plan CPU checks,
the five corpus helper tests, and TypeScript typecheck pass. This experiment
must remain isolated from `/post` and production.

Laya-driven Divar conversion queue prepared (2026-09-28 21:49 +0330): because
the earlier v8 location-only experiment did not satisfy the user's request to
run the approved Laya model over Divar ads, that experiment plan is preserved
but marked `superseded_before_launch`. A distinct v8 shadow plan now pins the
current v4 facts file (999,416 rows; SHA-256
`c08b0ac3ed7dc3bdcd253e0306301d5dd1d6060e6161e91b6f4dd3cc684c548c`), its
manifest, the exact Laya Multilingual revision/weights, and an MPS-only local
worker. A live, caffeinate-protected queue is waiting on v7; its dry-run reports
`queued_waiting_for_v6`, `willAllocateMps=false`, so it has not loaded Laya or
competed with the previous stage. After the full v7 report is verified, it will
run a 256-row contract pilot, then a resumable `--all` pass with batch size 8.
It binds only to loopback, starts no worker if port 8101 is already occupied,
sets Hugging Face offline mode, verifies the local checkpoint checksum and
actual MPS device, and stops only the worker process it created. Outputs retain
explicit `synthetic=true`, `realNeedGroundTruth=false`, and
`trainingEligible=false`; Laya supplies typed decisions, while the Persian
counterfactual sentence is still a deterministic template, not generated prose.
The converter has CPU tests for upstream fail-closed behavior, exact base-model
and MPS checks, row provenance, and full-output integrity. The full conversion
is not yet complete; no accuracy or training benefit is claimed, and this
shadow output will require field-level quality/coverage review before any
separate research fine-tuning stage.

Queue status refresh (2026-09-28 21:55 +0330): v3's manifest still says
`running`, but its last committed checkpoint remains 24,000/54,258 from
21:30:39; v6 remains waiting and the latest dry-run reports the checkpoint is
1,443 seconds old. This remains below its configured three-hour stale-progress
cutoff, so neither v6 nor later stages should start yet. OS process enumeration
and `kill(pid, 0)` are denied in this session, so the trainer PID's live state could
not be independently verified; the report distinguishes the manifest/watcher
state from proof that the process is currently executing. The new v8 queue is
live and continues to wait on v7 without loading Laya or allocating MPS.
