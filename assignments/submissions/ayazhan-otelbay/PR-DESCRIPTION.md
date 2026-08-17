# PR: A gate-behavior harness for the OPT authorization-wording bug in the Bayesian Role Scorer

Adds a runnable, subprocess-based harness around `scripts/score/role-scorer.mjs`
(Ch.11) that proves — and, with a proposed patch, closes — a real
misclassification in `applyProfile()`: standard I-765 OPT/STEM-OPT phrasing
("employment authorized under OPT") is silently read as "does not need
sponsorship," and negated citizenship statements ("not a US citizen") are
read as "is a citizen." Both zero the sponsorship vote weight for exactly
the candidates the composite is supposed to weight most heavily.

## What this adds

- `scripts/score/sponsorship-wording-harness.mjs` — spawns the real engine
 as a subprocess (never reimplements the classification logic), runs it
 against 6 fixed, fictional authorization-text fixtures, and compares the
 engine's own `profile_needs_sponsorship` output against a human-authored
 ground truth. Modes: `--mode=detect` (pre-fix, RED), `--mode=verify`
 (post-fix, GREEN), `--mode=probe-negation-placement` (a separate,
 non-gating probe for a known limitation — see below).
- `scripts/score/role-scorer.patched.mjs` — a proposed patch to
 `applyProfile()`: removes the bare token `authorized` from the
 sponsorship-exemption pattern (OPT candidates legitimately use this word
 while still needing future sponsorship), and adds negation-aware matching
 so a negation word immediately before an exemption token (e.g. "not a
 citizen") flips the read.
- `recipes/sponsorship-wording-harness.md` (nine sections) +
 `recipes/sponsorship-wording-harness.card.md` (6 failure modes, including
 the two mandatory: drift, contract-violation).
- `data/fixtures/wording-cases.json` — 7 fictional profile fixtures with
 human-authored ground truth, used by the harness.
- `assignments/submissions/ayazhan-otelbay/ATTESTATION-AND-HONEST-RUN.md`
 + `assignments/submissions/ayazhan-otelbay/runs/*.txt` — real archived
 terminal output for every claim below.

## The gap it closes

Before this patch, an OPT/STEM-OPT candidate describing their own
authorization status in standard I-765 language had their sponsorship vote
weight silently zeroed — the composite then treated every employer as if
visa status were irrelevant, for the population the weighting scheme
(sponsorship at 0.35, above fit at 0.30) exists to protect. Of 6 realistic
phrasings, 3 misclassified before the fix; 0 after.

## Conceptual chapter mapping

This targets the decision core of Ch.11 (the Bayesian Role Scorer) directly
— specifically the profile-conditional weighting in `applyProfile()` that
Ch.11's worked example depends on but does not test. It also touches Ch.16's
build-and-honest-run discipline: the harness's own break-attempts (see
attestation) found and fixed a real defect in the harness itself, not the
engine.

## Verified vs inferred (boundary)

From records: the engine's own `trace.votes`, `config.weights`, and
`profile_needs_sponsorship`, read verbatim via subprocess, never
reimplemented. Inferred: which 6 (then 7) fixture phrasings are worth
testing — a judgment call about which real-world phrasings matter, not a
claim of exhaustive coverage. Invented, by design: every fixture string;
all fictional, no real employer or candidate data.

## The one limitation it cannot verify

Whether these fixtures represent the full space of how real candidates
phrase their authorization status. The patch's negation-aware matching only
inspects words immediately *before* a matched exemption token; a negation
placed *after* the token ("US citizen? Not anymore, I need sponsorship
now") is not caught, and this is confirmed live via
`--mode=probe-negation-placement`, reported as a known boundary rather than
patched further. Also unresolved and explicitly not claimed as fixed:
`role_quality`'s weight is still 0 by design-omission — this contribution
reports that fact on every run but does not assign it a value, since no
chapter or design document pins one.

## Conformance

- `node scripts/score/sponsorship-wording-harness.mjs --mode=detect` →
 3/6 bugs, exit code 1 (reproduces the original finding on the unpatched
 engine).
- `node scripts/score/sponsorship-wording-harness.mjs --mode=verify
 --engine=scripts/score/role-scorer.patched.mjs` → 0/6 bugs, exit code 0.
- `node scripts/score/sponsorship-wording-harness.mjs
 --mode=probe-negation-placement --engine=scripts/score/role-scorer.patched.mjs`
 → confirms the negation-after-token limitation live.
- No `data/profile/`-style private file, no real candidate or employer data,
 anywhere in this contribution's scope.

## Note on parallel contributions

This targets `scripts/score/` and `recipes/`, paths that did not exist in
`main` before this session — the same paths introduced by PR #37. These are
independent contributions to the same new area of the repo; if both are
reviewed together, a filename collision on `role-scorer.mjs` /
`scorer-harness.mjs`-style files is expected from two students working the
same chapter in parallel, not a conflict either PR needs to resolve itself.

## Human sign-off

`assignments/submissions/ayazhan-otelbay/ATTESTATION-AND-HONEST-RUN.md` is
signed by a human; the system does not certify its own honesty.
