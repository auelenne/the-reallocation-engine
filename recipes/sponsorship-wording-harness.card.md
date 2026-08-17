card: sponsorship-wording-harness

Companion to recipes/sponsorship-wording-harness.md. Update in the SAME commit.

## Purpose

Prove — as an executable, CI-gatable check — that the sponsorship scorer
never silently zeroes the sponsorship vote weight for a candidate whose own
OPT/STEM-OPT authorization language contains the word "authorized." Separately,
surface (never silently fix) that `role_quality` weight is 0 by design-omission,
not by decision.

## What it CAN verify

- That a specific set of realistic authorization phrasings resolve to the
 CORRECT `needs_sponsorship` value when run through the real engine.
- That the fix (structured `visa_status` field takes precedence over free-text
 parsing) actually changes the engine's real output on the same fixtures —
 not a claim about the fix, the engine's own trace before and after.
- That `role_quality`'s weight, as read from the engine's own config/trace,
 is exactly what the harness reports (verbatim, not inferred).

## What it CANNOT verify

- Whether these 6 fixtures are representative of the full space of ways a
 real candidate might phrase their authorization status. This harness proves
 the mechanism of the bug (bare-token matching is negation- and
 context-blind), not a population-level misclassification rate.
- Whether `role_quality` *should* carry a nonzero weight. That is a design
 judgment the book leaves open; the harness reports the fact, not the
 verdict.
- Behavior on malformed or partial real-world profile records (missing
 fields, unexpected types) — the fixtures are clean, hand-written inputs.

## Dependencies

`node`, the real `scripts/score/role-scorer.mjs` (subprocess, not
reimplemented), `data/fixtures/wording-cases.json`. No network, no LLM.

## Commands (annotated)

```
# pre-fix: expected RED, reproduces the original audit finding (3/6 bugs)
node scripts/score/sponsorship-wording-harness.mjs --mode=detect

# post-fix: expected GREEN (0/6), run after applying the visa_status patch
node scripts/score/sponsorship-wording-harness.mjs --mode=verify
```

## What it produces

A 6-row PASS/BUG table with the literal fixture string, the regex token
matched, and the engine's real `trace.votes`/`trace.gates` output per row;
plus one `OPEN QUESTION` line reporting `role_quality`'s weight verbatim.

## Failure modes (≥4, incl. the two mandatory)

1. **drift (mandatory).** This card and `recipes/sponsorship-wording-harness.md`
 disagree on which fixtures exist or what the fix does. A reader trusts a
 stale description of the bug. Guard: both files updated in the same
 commit; `make verify`-equivalent checks recipe/card are paired.

2. **contract-violation (mandatory).** The harness issues a `BUG` or `PASS`
 verdict without a real, complete engine trace behind it. Concretely: a
 result can satisfy the top-level shape check
 (`profile_needs_sponsorship` present, `roles[]` non-empty) while the role
 itself carries no `trace.votes` at all — no sponsorship entry to compare
 against. This was found live during this contribution's own break-attempt
 2 and closed by requiring the sponsorship trace entry to exist before any
 verdict is issued.

3. **Fixture narrowness.** All 6 gating fixtures are hand-written, clean
 strings. A real candidate's free-text description could combine phrasings
 in ways not covered here, and the harness would not catch a combination it
 wasn't given. Stated, not claimed as covered.

4. **Negation-placement blind spot in the fix itself.** The patch's
 negation check only inspects the words immediately before a matched
 exemption token. A candidate who places the negation after the token
 ("US citizen? Not anymore, I need sponsorship now") is misclassified the
 same way the original bug misclassified "not a US citizen" — just with
 the words in a different order. Confirmed live via a dedicated,
 non-gating probe (`--mode=probe-negation-placement`). Not patched further
 in this contribution; reported as the explicit boundary of what the fix
 covers.

5. **Silent regression via unrelated engine change.** If a future edit to
 `role-scorer.mjs` renames or removes a `trace.votes` field without
 changing the sponsorship logic itself, the harness could stop reading the
 field it depends on and pass trivially on every fixture. Guard: the
 harness requires the sponsorship trace entry to exist (see failure mode 2)
 and fails loudly rather than silently passing if it disappears.

6. **role_quality open-question mistaken for closed.** If a future reader
 sees the `OPEN QUESTION` line stop appearing (e.g. because the harness was
 edited to drop that check to "clean up output"), they could wrongly assume
 the weight question was resolved. Guard: G2 in the recipe is a
 non-negotiable, always-printed line, not a conditional one.
