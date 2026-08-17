# Capstone — Verified-data attestation & honest run

Contribution: `scripts/score/sponsorship-wording-harness.mjs` — a gate-behavior
harness proving (and, with a proposed patch, closing) the OPT
authorization-wording bug in `applyProfile()`, plus a non-gating
open-question report on `role_quality`.

Written against what was actually run on 2026-08-17. Raw terminal output
archived in `runs/`. No verdict sentence: this records what was and was not
verified, and a human signs it.

## Step 3 — Verified-data attestation

### 3a. Verified vs inferred boundary table

| Field the contribution emits | Label | Traces to |
|---|---|---|
| PASS/BUG/NO RESULT verdict per fixture | script-output | real subprocess call to `role-scorer.mjs` (or the patched variant), compared against ground truth |
| exact fixture string that triggered a bug | record (your-input, fixed by construction) | `data/fixtures/wording-cases.json` |
| regex token matched / sponsorship weight used | script-output | engine's own `applyProfile()` / `trace.votes`, read verbatim |
| `role_quality` weight value | script-output | engine's own `config.weights.role_quality`, read verbatim, never computed |
| "3/6 misclassified" pre-fix count | script-output | real run archived in `runs/detect-prefix.txt` |
| "0/6 misclassified" post-fix count | script-output | real run archived in `runs/verify-postfix.txt` |
| negation-after-token limitation | script-output (limitation, not a claim of coverage) | real run archived in `runs/negation-placement-probe.txt` |
| whether 6 fixtures represent all real phrasings | **missing / explicitly not claimed** | stated limitation, not measured |
| ground-truth need-for-sponsorship per fixture | your-input | fixtures are fictional profiles I authored; truth is known by construction |

### 3b. Every number traces

- **3/6 phrasings misclassified pre-fix** → `runs/detect-prefix.txt`, real run
 of `sponsorship-wording-harness.mjs --mode=detect` against the unmodified
 `role-scorer.mjs`. Exit code 1.
- **0/6 misclassified post-fix** → `runs/verify-postfix.txt`, same command
 against `role-scorer.patched.mjs`. Exit code 0.
- **negation-after-token limitation confirmed** → `runs/negation-placement-probe.txt`,
 a separate, non-gating probe against the patched engine.
- **role_quality weight = 0** → read live from `config.weights.role_quality`
 in every run's trace; unchanged before and after the fix.
- No coverage rate, sponsorship rate, or calibration figure is emitted by
 this contribution. It reports classification correctness on a fixed,
 fictional, hand-authored fixture set — nothing here is a claim about real
 users or real postings.

### 3c. Ethics gate

- **(a) Privacy.** No real candidate data, no real employer data touched.
 All 7 fixtures (`data/fixtures/profiles/*.json`) are fictional, hand-written
 strings.
- **(b) Honesty.** The harness never issues a PASS/BUG verdict without a
 real, well-formed engine trace behind it — enforced by the `NO RESULT`
 exit path, and by keeping the negation-placement gap as an explicit,
 separately-reported limitation instead of quietly patching around it in a
 way that would just move the same gap somewhere else.

## Step 4 — The honest run

### 4a. Plausibility audit (before trusting output)

- **Does the pre-fix run reproduce the original audit's 3/6 count?** Yes,
 exactly: cases 3 (negation-blind "not a US citizen"), 4 ("employment
 authorized under OPT"), and 5 (STEM-OPT phrasing) misclassify; cases 1, 2,
 6 correctly classify.
- **Does the post-fix run show 0/6, and does the fix hold in the opposite
 direction?** Checked directly: case1 ("US citizen") and case2 ("Green card
 holder") — both true non-sponsor cases — still correctly resolve to
 `needs_sponsorship: false` after the patch. The fix closes the original
 false-negative direction without flipping a correct exemption into a false
 sponsorship-need.
- **Does `role_quality` still read as an open question?** Yes, unaffected —
 `0.0` in every run, before and after the patch.

### 4b. Real terminal output (archived, not described)

- `runs/detect-prefix.txt` — full run against the real, unpatched engine.
 6 fixtures, 3 bugs, exit code 1.
- `runs/verify-postfix.txt` — full run against the patched engine. 6
 fixtures, 0 bugs, exit code 0.
- `runs/break-attempt-1-crash.txt` — engine stubbed to crash.
- `runs/break-attempt-2-empty-trace-after-fix.txt` — see 4c below.
- `runs/negation-placement-probe.txt` — see 4c below.

### 4c. Deliberate break attempts

I tried to break my own contribution in three ways: two aimed at the
harness itself (can it be fooled by a malformed run?), one aimed at the fix
(can the negation check itself be evaded?).

**Attempt 1 — crash the upstream engine.** I stubbed `role-scorer.mjs` to
exit(1) immediately with no output, simulating a broken deploy or a missing
dependency. Result: all 6 fixtures correctly report `NO RESULT`, and the
harness itself exits 1 rather than silently treating the absence of output
as a clean pass. Guard held; nothing to fix.

**Attempt 2 — a technically well-shaped but empty result.** I stubbed the
engine to exit 0 and write a JSON file that satisfies the harness's
top-level checks (`profile_needs_sponsorship` is a real boolean, `roles[]`
is non-empty) but whose single role carries no `trace` object at all — no
sponsorship vote, nothing to compare against. Before I added a second guard,
the harness compared `profile_needs_sponsorship` on its own and issued four
confident `PASS` verdicts and two confident `BUG` verdicts from a stub that
never actually classified anything — with the sponsorship weight printed as
`null` right next to each verdict, which nobody was checking. **This is the
one real defect this session found**, and it was in my own tooling, not in
the engine under test. Fix: the harness now also requires
`role.trace.votes` to contain a `sponsorship` entry before it will issue
any verdict; re-running the same stub after the fix now correctly reports
`NO RESULT` on all 6 fixtures (archived in
`runs/break-attempt-2-empty-trace-after-fix.txt`). I re-confirmed detect
(RED, 3/6) and verify (GREEN, 0/6) were unaffected by this change.

**Attempt 3 — attack the fix itself, not the harness.** My patch adds
negation-aware matching, but it only inspects the words immediately
*before* a matched exemption token. So I tried moving the negation to
*after* the token: `"US citizen? Not anymore, I actually need sponsorship
now"`. Result: the patched engine still returns `needs_sponsorship: false`
— the limitation is real (`runs/negation-placement-probe.txt`). I am not
patching this further in this contribution. Chasing every possible word
order with more regex is the same fragile approach that produced the
original bug, just with a longer rule; the honest move is to name the
boundary of what this fix covers (negation immediately preceding the
matched token) rather than imply broader coverage than the fix actually
has.

The break attempt worth reporting here is Attempt 2: it found a real gap in
my own tooling, and the fix for it is now part of the shipped harness, not
a footnote. Attempt 3 did not find a bug in the harness — it found the
honest edge of what the fix covers, and that edge is reported rather than
hidden or endlessly patched around.

### 4d. Metric readout

- Behavioral promises enforced by an executable check: 0 → 1 (this harness).
- Misclassifications on the 6-fixture set: 3 → 0.
- Harness defects found and fixed during break-attempts: 1 (Attempt 2).
- Fix-boundary limitations found and reported, not fixed: 1 (Attempt 3,
 negation-after-token).
- `role_quality`: still 0, still unresolved, reported not fixed.

### 4e. What the machine could not know

The harness proves the *mechanism* of the wording bug (bare-token matching
is context- and negation-blind, in the direction the fix covers) on a
small, fictional, hand-written fixture set. It cannot show how real
candidates actually phrase their authorization status in the wild — a real
profile could place a negation after the token, combine phrasings in ways
none of these fixtures anticipate, or use language altogether outside this
regex-based approach, and the harness would not catch a case it wasn't
given. It cannot decide whether `role_quality` deserves a nonzero weight —
that is a design judgment the book leaves open on purpose, not a gap this
harness is built to close.

## Signature

I have read the above and confirm it reflects what was and was not verified.

Signed: Ayazhan Otelbay Date: 2026-08-17
