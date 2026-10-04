# Laya neighborhood stage v7: data-readiness audit

## Why this stage exists

The active v3 experiment does not train location fields, and the queued v6
experiment trains only category, property kind, and transaction type. This audit
prepares the next location-focused stage without competing for MPS or creating
labels from text that does not state the location.

## Evidence and method

The aggregate-only audit is reproducible with:

```bash
python scripts/datasets/audit-divar-neighborhood-text-evidence.py \
  --input data/divar/divar-property-offer-facts-v4-exact-current-city-map-2026-09-28.jsonl \
  --manifest data/divar/divar-property-offer-facts-v4-exact-current-city-map-2026-09-28.jsonl.manifest.json \
  --output data/divar/divar-neighborhood-text-evidence-v4-exact-city-legacy-aliases-audit-2026-09-28.json
python scripts/datasets/test_audit_divar_neighborhood_text_evidence.py
```

It verifies the input facts row count against the pinned source manifest and
hashes the exact input file. It considers only city-scoped catalog mappings of
the two explicitly reported kinds, `exact_official_crosswalk` and
`legacy_suffix_alias`, and never merges their rates. It then looks for the
corresponding catalog label in the ad text after Persian/Arabic character,
digit, diacritic, half-space, and spacing normalization, requiring token
boundaries. It writes aggregate counts only; no ad text or row identifiers are
emitted.

The retained-facts row audit is a separate streaming check. It uses the
application's city-slug-to-catalog fallback resolver, reads the complete
retained JSONL privately, validates row identity/splits and city-scoped
neighborhood IDs/names, and emits aggregate counts only:

```bash
python scripts/datasets/audit_divar_facts_row_quality.py \
  --input data/divar/divar-property-offer-facts-v4-exact-current-city-map-2026-09-28.jsonl \
  --manifest data/divar/divar-property-offer-facts-v4-exact-current-city-map-2026-09-28.jsonl.manifest.json \
  --catalog-dir src/data/neighborhoods/catalog \
  --output data/divar/divar-property-offer-facts-v4-row-quality-audit-2026-09-28-r2.json
python scripts/datasets/test_audit_divar_facts_row_quality.py
```

The first attempt's direct city-slug-to-filename join was not equivalent to
the app resolver and undercounted neighborhoods. Its report is retained but
marked `superseded_preliminary_city_slug_join`; only the corrected `-r2.json`
report below is authoritative.

## Findings

| Measure | Result |
| --- | ---: |
| Normalized Divar offer rows read | 999,416 |
| Rows with exact Divar-to-app neighborhood mapping | 420,989 |
| Mapped rows whose own catalog neighborhood name occurs in text | 119,956 (28.49% of mapped) |
| Unique normalized text groups with an exact mention | 119,551 |
| Conflicting text groups | 1 |
| Cross-split text groups | 0 |
| Potential usable groups after quarantining the conflict | 119,550 |

Exact-mention rates vary substantially by source city: Tehran 31.79%, Mashhad
22.56%, Isfahan 23.22%, Karaj 31.56%, Shiraz 24.01%, Ahvaz 33.15%, Qom 16.00%,
Rasht 35.05%, Bandar Anzali 26.58%, Lahijan 15.49%, and Talesh 5.00%. These are
coverage rates for this weak-label filter, not model accuracy.

## Corrected full retained-row scan (2026-09-28)

The corrected aggregate report is
`data/divar/divar-property-offer-facts-v4-row-quality-audit-2026-09-28-r2.json`.
It read and parsed all 999,416 expected retained fact rows from the pinned
2,516,650,697-byte file (SHA-256
`c08b0ac3ed7dc3bdcd253e0306301d5dd1d6060e6161e91b6f4dd3cc684c548c`), with
zero malformed JSON rows. There were zero duplicate example IDs, zero
duplicate source ordinals, and zero normalized-text groups crossing data
splits. It found 3,341 duplicate normalized-text groups (3,541 rows beyond
the first member); those duplicates remain in the same split and must be
interpreted under the source manifest's weighting policy. The source manifest's
3,576 groups / 3,889 duplicate rows are computed over the full source before
filtering, while this row scan measures the 999,416 retained facts; the two
counts are not directly reconcilable without joining each skipped row.

The row-level resolver check confirms 967,127/999,416 facts have an app city
(96.77%) and 430,268/999,416 have a mapped neighborhood (43.05%). Across 1,188
distinct source city-neighborhood pairs, 1,152 resolve to app catalog pairs;
no mapped neighborhood ID was absent from its resolved city catalog, and no
catalog-name mismatch was found. The city resolver's five slug-to-catalog
fallbacks are listed in the aggregate report. The audit does not establish
that a source geotag is truthful, nor does it turn seller offers into real
seeker needs. Regex contact scanning is not a complete privacy review; rights,
privacy, and ODbL review remain pending and cloud transfer remains disallowed.

## Refreshed city and legacy-alias audit (2026-09-28)

A new immutable facts snapshot was built from the same pinned Divar file after
verifying two additional exact city aliases against Divar's numeric city ID,
unique location-tree record, official slug, Persian name, and the app catalog:
`shahrud → shahrood` and `saman-city → samman`. The refresh also uses the
current crosswalk artifact, which preserves terminal `قدیمی` matches as the
separate `legacy_suffix_alias` provenance instead of upgrading them to exact
current-name matches.

| Measure | Result |
| --- | ---: |
| Source offer rows | 999,416 |
| Source cities represented by app catalogs | 397 / 421 |
| Rows with an app city | 967,127 |
| Rows with mapped neighborhood, any accepted match kind | 430,268 |
| Exact official-name neighborhood mappings | 420,989 |
| Legacy-suffix aliases, kept separate | 9,279 |
| Exact official-name mentions in text | 119,956 (28.49% of exact mappings) |
| Legacy-alias name mentions in text | 2,327 (25.08% of alias mappings) |
| All catalog-name mentions | 122,283 (28.42% of mapped rows) |
| Unique mentioned text groups / conflicting groups / cross-split groups | 121,875 / 1 / 0 |

These counts are in
`data/divar/divar-property-offer-facts-v4-exact-current-city-map-2026-09-28.jsonl.manifest.json`
and the aggregate-only report
`data/divar/divar-neighborhood-text-evidence-v4-exact-city-legacy-aliases-audit-2026-09-28.json`.
The report validates the complete input row count and SHA-256 against the facts
manifest. Exact and legacy-alias evidence are measured independently. The
remaining 24 Divar source city slugs have no unique matching app catalog and
remain unmapped rather than being assigned to a nearby city.

## Interpretation and guardrails

- The labels are seller/agent offer geotags. They are not real seeker-needs
  labels and do not establish end-user accuracy.
- An exact text mention is only evidence that the name is present; it does not
  prove the geotag is correct or that the named area is the user's desired
  neighborhood. No human validation was performed.
- 3000 fewer rows survive than a simple substring scan after token-boundary
  checks. This is why the simpler count must not be used as a training count.
- No location model training is scheduled from this audit alone. It is a
  source-grounded shadow/evaluation candidate set, with a conflict quarantined.
- The v3 active run and queued v6 full-parameter run do not train city or
  neighborhood fields. The v6 plan remains pinned to its reviewed corpus; the
  refreshed facts snapshot is a separate follow-on input, not a mutation of
  that plan or of the active trainer's input.
- The v3/v6 hypothetical request text is produced by deterministic templates,
  not generated by Laya. Their training manifests explicitly say
  `layaPredictionsUsedAsLabels: false`; Laya is used for the typed-decision
  contract/forward pass, while labels come from Divar source facts. The current
  loss therefore cannot establish that Laya actively converted ads into
  requests or learned authentic seeker phrasing.
- The local Laya batch worker at `127.0.0.1:8101` was not listening during this
  audit. Do not start it on MPS while the current trainer is using the device;
  prepare its next local shadow pass only after the serialized training gate.
- The next useful work is a local Laya-vs-rules comparison on a small,
  city-scoped candidate set. Deterministic exact matches should resolve
  directly; Laya should only be evaluated when the text genuinely leaves
  multiple plausible neighborhoods. A missing mention remains unknown.
- Keep the current sequence: v3 MPS run, then the already-queued v6 MPS pilot
  and experiment, then inspect v6 held-out results before authorizing any
  location fine-tuning. `maxConcurrentMpsJobs` remains one.
- The Divar corpus is local-only in this workflow; rights/privacy review is
  still pending, and this artifact does not authorize redistribution or
  production use.

## Readiness decision

The location-data audit and regression checks are ready. A v7 Laya training run
is **not** ready yet: candidate lists for multi-place text, benchmark strata,
and the value of Laya over the deterministic resolver still need to be
measured. Do not turn the 119,550 weakly labeled offer-text groups into claims
of one million real needs or real-user accuracy.

## Candidate-choice preparation

The follow-on builder is now implemented at
`scripts/datasets/build-divar-neighborhood-candidate-corpus.ts`. It consumes
the pinned v4 facts, the same city-ID/catalog loader used by `/post`, and the
existing `resolveTextNeighborhoodInCity` resolver. This matters for aliases
such as `tehran` ↔ `tehran-city`; a helper that reads a guessed filename can
silently undercount otherwise available catalogs.
It preserves only exact official Divar-to-app city/neighborhood mappings,
quarantines conflicting or cross-split normalized text groups, deduplicates to
one example per group, requires explicit city-scoped location evidence, and
emits a Laya `choice` question only when there are 2–8 resolver candidates and
the mapped target is among them. Unique exact matches remain rules-only; no
mention, a target outside the candidate set, excessive ambiguity, and text
describing a boundary between two places abstain. The row carries the selected
app city and bounded candidates as context.

Run it locally with:

```bash
bun scripts/datasets/build-divar-neighborhood-candidate-corpus.ts
bun scripts/datasets/test-divar-neighborhood-candidate-corpus.ts
```

The emitted JSONL is labeled as a local-only shadow corpus, not a seeker-need
dataset and not training-/production-eligible. Its labels are still weak:
even an exact geotag plus an explicit place mention does not prove the seller's
pin is correct or that the mentioned place is the intended point. Its purpose
is to build a held-out comparison of Laya against the same deterministic
resolver, not to convert geotags into ground truth. The builder records the
input and output hashes and split/candidate counts without printing source text.

The first complete build is:

| Measure | Result |
| --- | ---: |
| Candidate rows | 9,580 |
| Cities with eligible ambiguity | 9 |
| Split | 7,585 train / 983 calibration / 1,012 test |
| Candidate count | 4,376 with 2; 2,039 with 3; 1,026 with 4; 1,121 with 5; 418 with 6; 378 with 7; 222 with 8 |
| Output SHA-256 | `6c25840d700d824adf7376e3a9c82d4c51103e0febb764d23dc9cbe4abd0b525` |

The artifact is
`data/divar/divar-neighborhood-candidate-shadow-v1-exact-city-2026-09-28-r3.jsonl`
with its adjacent `.manifest.json`. A second aggregate pass matched the JSONL
hash and row count to the manifest and verified every target is among its
2–8 offered city-catalog options, each question has `unknown`, and every row
remains `trainingEligible: false` and `realNeedGroundTruth: false`. This is
candidate-set preparation, not a model benchmark; no Laya inference was run.
Only 9 cities have eligible rows under these conservative rules, so this must
not be presented as broad national coverage.

This prepares the location stage while v3 trains and v6 waits in the existing
single-MPS queue. It does not add neighborhood fields to v3/v6 or run inference
beside MPS training. The already-armed v7 job is a held-out benchmark after
v6—not a training launch—and the following batch-inference stage remains gated
on that benchmark and measured runtime. Every stage is prepared while the
previous stage runs, but starts only after its predecessor releases the MPS
gate.

## /post runtime integration and regression checks

The /post API now turns an ambiguous, city-scoped resolver result into one
Laya `choice` question only when there are 2–8 catalog candidates. The offered
choices are exactly those returned by the existing location resolver, plus
`unknown`; the selected city is preserved. An exact deterministic neighborhood
match still bypasses Laya. A model selection is returned as a proposal that
requires the user's confirmation, and the normal location controller then
updates the selected neighborhood and map pin. The card marks the proposed
candidate in the existing candidate list rather than duplicating it as a
second control.

The API regression test stubs the loopback Laya response and verifies the
question is bounded, the answer must match a supplied candidate, and no model
answer is auto-applied. This verifies route/contract behavior, **not** Laya's
real-world accuracy. The worker is not started while v3 owns MPS.

Verified checks for this integration:

```text
npm run test:post-natural
bun scripts/datasets/test-divar-neighborhood-candidate-corpus.ts
bun scripts/datasets/test-divar-laya-question-factory.ts
mini-services/laya-post/.venv/bin/python mini-services/laya-post/test_batch.py
bunx tsc --noEmit --pretty false
bunx eslint <changed /post files>
```

The checked-in local shadow runner already supports a future, serialized
Laya-derived hypothetical pass via `scripts/datasets/run-divar-laya-shadow.ts
--all --hypothetical-needs`. It asks typed questions against the original
offer text and combines only supported decisions with deterministic facts; it
does not use generative text completion. Its output is still explicitly
hypothetical and ineligible for training/production by default. Prepare this
after the existing v6 job and evaluate it before changing a training manifest;
do not run another model workload concurrently with the active MPS trainer.

## Held-out Laya comparison prepared during v3/v6

The local-only evaluator
`scripts/datasets/finetune/benchmark-divar-neighborhood-laya.py` is prepared for
the next free MPS window. It validates the candidate corpus hash and manifest,
accepts only the pinned base checkpoint or a completed research checkpoint
derived from that exact base, evaluates every `test` row, and writes aggregate
metrics only (accuracy with abstentions, coverage, selective accuracy, macro
F1, city/candidate-count slices, latency, and peak process memory). The output
contains no ad text, row IDs, or per-row predictions. It requires the currently
pinned `laya==0.3.20`; it does not download or call a remote model.

CPU-only contract tests, which do not load a checkpoint or perform inference:

```bash
mini-services/laya-post/.venv/bin/python -I \
  scripts/datasets/finetune/test_benchmark_divar_neighborhood_laya.py
```

The sequential local watcher
`scripts/datasets/finetune/queue-divar-v7-neighborhood-benchmark-after-v6.py`
is armed and waiting for v6's successful full held-out evaluation, then verify the
checkpoint and all research-only provenance gates, then run this benchmark on
the MPS checkpoint from v6. It never starts concurrently with v3/v6 and never
starts location training. Its plan is
`data/laya-experiments/divar-v7-neighborhood-benchmark-after-v6-2026-09-28.json`.
Run it from the repository root with the pinned local Python:

```bash
mini-services/laya-post/.venv/bin/python \
  scripts/datasets/finetune/queue-divar-v7-neighborhood-benchmark-after-v6.py
```

The queue can be checked without inference using `--dry-run`. Because the local
process sandbox cannot inspect other process IDs, any upstream state short of
the v6 completion marker remains waiting; it will not infer from a stale or
ambiguous process state. The v6 queue writes that marker only after its MPS
evaluation subprocess exits and the full report validates.

This is an evaluation gate, not a v7 training launch. If Laya does not beat
abstention with acceptable city/class support on the held-out weak labels, keep
the production resolver deterministic and do not fine-tune location from this
artifact. Even a positive result remains a seller-geotag proxy, not real-user
need accuracy; broader city coverage and human-reviewed/consented demand data
remain separate requirements.

## App-catalog coverage audit prepared in parallel

The aggregate-only audit at `scripts/datasets/audit-divar-app-coverage.ts`
compares the current v4 facts manifest and exact/legacy neighborhood
crosswalk with `/post`'s category tree and all checked-in city catalogs. It
does not read or print listing text. Its regression test is
`scripts/datasets/test-audit-divar-app-coverage.ts`; the reproducible summary
and manual counterfactual-batch checks are also recorded in
`data/divar/laya-divar-readiness-audit-2026-09-28.ipynb`.

Current coverage, with denominators kept separate:

| Measure | Result |
| --- | ---: |
| App real-estate leaf categories / source categories | 18 / 16 |
| App leaves missing from Divar | `agency-services`, `land-rent` |
| App city catalogs / unique city-neighborhood IDs | 1,207 / 48,110 |
| Divar cities mapping to an app city | 397 / 421 (94.30% of source cities) |
| App catalog cities represented by Divar | 397 / 1,207 (32.89%) |
| Retained offer rows with mapped app city | 967,127 / 999,416 (96.77%) |
| Source city-neighborhood pairs resolved exactly / with aliases | 1,120 / 32 of 1,188 (96.97% combined) |
| Retained offer rows with mapped app neighborhood | 430,268 / 999,416 (43.05%) |

The crosswalk's exact-plus-alias row count is 430,388, which is 120 higher
than the retained facts manifest's 430,268. This is bounded by the 584 rows
excluded from the retained corpus, but the aggregate manifests do not identify
which excluded rows had mapped neighborhoods; the omission reason is therefore
not reconciled row-by-row. Divar-only coverage also leaves two app categories
and 24 source cities without a unique app-city match. Those gaps must remain
explicit rather than being filled with guessed labels.

Manual batches 02–06 contain 68 unique, individually authored
counterfactuals across 22 app cities, 33 exact city-neighborhood pairs, and 16
property categories. They are still synthetic, unreviewed, and ineligible for
real-need or auxiliary fine-tuning; counts alone do not make them training
data. The notebook now reads the corrected aggregate row-audit report and
checks its source-manifest hash and retained row count. A Jupyter renderer is
not installed in the local runtimes, so no rendered notebook preview is
claimed.

Repeat the current contract checks with:

```bash
bun scripts/datasets/test-audit-divar-app-coverage.ts
bun scripts/datasets/audit-divar-app-coverage.ts
mini-services/laya-post/.venv/bin/python \
  scripts/datasets/finetune/test_queue_divar_v6_after_v3.py
mini-services/laya-post/.venv/bin/python \
  scripts/datasets/finetune/test_queue_divar_v7_neighborhood_benchmark.py
```

At 2026-09-28 16:58 UTC, a read-only exact-PID process check verified v3 trainer
56641 and its `caffeinate` wrapper 56642 were alive; its manifest still said
`running`, and the latest persisted checkpoint was 21,000/54,258 with mean
loss -0.18531 (progress file mtime 16:34 UTC, about 25 minutes old). The
trainer showed 5.0% CPU at that instant; this does not reveal MPS utilization.
This is checkpoint telemetry, not in-memory state, convergence, accuracy, or
evidence of real-user performance. The v6 queue process 87995 is alive and remains
`queued_waiting_for_v3`; the v7 watcher reports waiting for v6. No duplicate
watcher or concurrent MPS training was started. v6 remains fail-closed: it
requires the final v3 evaluation, completed checkpoint, and exit of the exact
upstream processes before its own bounded MPS pilot/full run. The separate v7
benchmark is prepared behind v6's full held-out evaluation gate and performs
no location fine-tuning.
