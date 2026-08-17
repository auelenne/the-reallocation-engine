recipe: sponsorship-wording-harness — proving (and closing) the OPT authorization-wording bug

Inherits the repo's shared verified-data rules (SNICKERDOODLE.md / DATA_CONTRACT.md / recipes/_shared.md).
Scope note: this harness targets ONE named failure in the Bayesian Role Scorer
(Ch.11, `scripts/score/role-scorer.mjs`, `applyProfile()`): a wording-pattern
match that silently zeros the sponsorship vote weight for candidates who
describe their own OPT work authorization in standard I-765 language.

## 1. Executive summary

`applyProfile()` decides whether a candidate needs visa sponsorship by
regex-matching free text against
`/citizen|permanent|green|gc|pr\b|no.?sponsor|authorized/`. An F-1/OPT
candidate who accurately writes "employment authorized under OPT" matches
`authorized` and is classified `needs_sponsorship: False` — the engine then
treats every employer as if visa status were irrelevant, for exactly the
population it exists to serve. Tested on 6 realistic phrasings, 3/6
misclassify, including a negation-blind failure ("not a US citizen" ->
read as citizen). This harness turns that finding into an executable,
CI-gatable assertion, and ships a fix: match on an explicit structured
`visa_status` field first; only fall back to text parsing when that field
is absent, and never let the bare token "authorized" alone imply no
sponsorship needed.

## 2. Required reads

- `SNICKERDOODLE.md` / `DATA_CONTRACT.md` — verified-data contract this
 harness enforces (a misclassification is a contract violation, not a
 style issue).
- `scripts/score/role-scorer.mjs`, `applyProfile()` (the code under test)
 and the `[VERIFY]` comment on `role_quality` (the harness's second,
 non-gating check).
- `docs/search-profile-design.md` (or equivalent design doc), for whatever
 prose promise exists about how `needs_sponsorship` should be derived.

## 3. Phase gates

**G1 — Wording bug is caught (the graded property).**
Command: `node scripts/score/sponsorship-wording-harness.mjs --mode=detect`
Passes when all 6 fixture phrasings resolve to the CORRECT
`needs_sponsorship` value. Failure path: if any OPT/STEM-OPT phrasing
resolves to `needs_sponsorship: False`, STOP — do not let the composite
score run on that profile; the sponsorship vote weight would be silently
zeroed for a population the tool exists to protect.

**G2 — `role_quality` is reported, never invented (open-question gate).**
Check: harness reads `config.weights.role_quality` from the real engine's
own trace and reports it verbatim. Failure path: this gate never fails CI;
it prints a loud, non-blocking `OPEN QUESTION` line. Assigning a number
here without a source would itself be a contract violation — prefer
"not implemented yet" over a guessed weight (see Step 4 of the honest run).

## 4. Primary stored tools

- `scripts/score/sponsorship-wording-harness.mjs` — the harness itself,
 spawns `role-scorer.mjs` as a real subprocess (never reimplements it).
- `scripts/score/role-scorer.mjs` — the real, unmodified/lightly-patched
 engine under test (the patch is the fix in Step 5 of the honest run,
 tracked as a diff, not a rewrite).

## 5. Workflow

1. Load 6 fixture profiles (`data/fixtures/wording-cases.json`), each
 varying only the free-text authorization description; visa ground
 truth (does this candidate actually need sponsorship?) is fixed
 per-fixture and known by construction (fictional profiles).
2. For each fixture, spawn `role-scorer.mjs` via subprocess with that
 profile and a fixed posting set; capture the real
 `needs_sponsorship` decision and the full `trace.votes` /
 `trace.gates` output — never parsed from stdout with regex, always
 the engine's own structured JSON.
3. Compare each decision to ground truth. Any mismatch is a **bug**
 (has a correct answer); log it with the exact fixture string and the
 engine's own trace line that produced it.
4. Separately, read `config.weights.role_quality` from the same trace
 and report it as an **open question** (structural, not case-specific
 — see the explainability caveat already documented in the audit).
5. Run in `--mode=detect` (pre-fix, expected RED) and `--mode=verify`
 (post-fix, expected GREEN) against the same 6 fixtures.
6. Separately, `--mode=probe-negation-placement` runs one additional,
 non-gating fixture that documents a known limitation of the fix: the
 negation check only inspects words immediately before a matched token, so
 a negation placed after the token is not caught. This does not affect the
 6-fixture G1 gate above and is reported, not silently patched further.

## 6. Output contract

- Script produces: one `PASS`/`BUG` verdict per fixture with the
 misclassified string, the regex token that matched, and the full
 engine trace; plus one `OPEN QUESTION` line for `role_quality`.
- Human reads: a summary table (6 rows) and an explicit exit code
 (0 = all fixtures correct, non-zero = at least one bug found).
- Shape rule: a `BUG` verdict always carries the literal input string
 and the real engine trace that produced it — never a paraphrase.

## 7. Verification checks

- `node scripts/score/sponsorship-wording-harness.mjs --mode=detect`
 on unpatched `role-scorer.mjs` → RED (3/6 bugs reported, matching the
 audit's original finding).
- Same command on the patched engine → GREEN (0/6).
- `role_quality` open-question line present in both runs, unchanged
 (this check must never silently start passing/failing based on
 something the harness didn't actually verify).

## 8. Logging rules

Append one entry per real run to `logs/RUN_LOG.md`: date, recipe name,
mode (`detect`/`verify`), the 6-row result table, and the
`role_quality` open-question line verbatim from the trace.

## 9. Stop conditions

- Stop and report `BUG`, never silently downgrade a misclassification to
 a warning — the whole point is that this failure currently produces a
 confident, well-formed wrong answer.
- Stop before assigning a number to `role_quality`. Report it, do not
 fix it — no chapter or design doc pins a value, so any number chosen
 would be invented.
- Stop the harness (non-zero exit) if the subprocess call to
 `role-scorer.mjs` fails or returns malformed JSON — never compare
 `undefined` to an expected value and call it a finding (see the
 break-attempt section of the honest run).
