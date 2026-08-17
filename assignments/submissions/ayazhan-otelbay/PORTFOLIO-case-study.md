# A wording bug that quietly zeroed the one number that mattered

**Ayazhan Otelbay** · INFO 7375, Computational Skepticism for AI

## The problem

An international candidate on OPT or STEM-OPT has one number that should
dominate every other signal in a job search: does this employer sponsor
visas. Everything else — fit, role quality, how impressive the company is
— is secondary to a candidate on a finite work-authorization clock, because
a great-fit role at a company that will never sponsor is not a job, it's a
countdown.

The Reallocation Engine's Bayesian Role Scorer (Ch.11) encodes exactly this
priority: sponsorship carries a weight of 0.35, above fit at 0.30, because
sponsorship is the constraint most likely to cause an invisible rejection
for this population. The weighting is only as good as the classification
feeding it. If the system gets the candidate's own sponsorship need wrong,
the weighting scheme's entire justification collapses — a correctly-weighted
composite computed on a wrong input is still a wrong recommendation, dressed
up as a careful one.

## What I built

A harness that spawns the real scorer engine as a subprocess — never
reimplements its logic — feeds it fixed, fictional candidate-authorization
strings, and checks whether `applyProfile()` classifies each one correctly.
It found that the engine's sponsorship classifier reads free text against a
small set of tokens, and one of those tokens is `authorized`. An OPT
candidate who accurately describes themselves using standard I-765 language
— "employment authorized under OPT" — gets silently classified as *not*
needing sponsorship, and the composite proceeds to treat every employer as
if visa status were irrelevant.

I built two things: the harness that proves this (and can be re-run
whenever `applyProfile()` changes, to catch a regression before it ships),
and a proposed patch — negation-aware matching plus removal of the bare
`authorized` token — that closes the specific failures the harness found.

```
6 fictional authorization strings
        │
        ▼
role-scorer.mjs (real engine, subprocess)
        │
        ▼
profile_needs_sponsorship + full trace
        │
        ▼
compare against human-authored ground truth
        │
        ▼
PASS / BUG / NO RESULT, per fixture
```

## The measurable improvement

| | Before | After |
|---|---|---|
| Authorization phrasings misclassified, of 6 tested | 3 | 0 |
| Harness exit code | 1 | 0 |
| Behavioral promise enforced by an executable check | 0 | 1 |

The number worth being precise about: 3 of 6 is a count over a small,
hand-written fixture set I authored — not a measured error rate over real
candidates, and I'm not describing it as one. What it demonstrates is the
*mechanism*: bare-token regex matching is blind to negation and to the
specific vocabulary OPT candidates are required to use on their own I-765
paperwork. That mechanism, once named, is exactly the kind of failure that
would otherwise ship silently — a confident, well-formed, wrong
classification, with nothing in the output that looks unusual.

## Verified vs. inferred

**Verified**, from a real subprocess call to the engine: every
`PASS`/`BUG`/`NO RESULT` verdict, the exact sponsorship weight the engine
used per fixture, and `role_quality`'s weight (still 0, read directly from
the engine's own config — not something I computed or assumed).

**Inferred**: which authorization phrasings are worth testing in the first
place. I chose 6 (later 7) fixtures based on what OPT/STEM-OPT paperwork
actually says; that's a judgment about relevance, not a claim that these
are the only phrasings that matter.

**Invented, by design**: every fixture string. All fictional — no real
employer, no real candidate, no real posting appears anywhere in this
contribution.

No coverage rate, sponsorship rate, or calibration figure is emitted
anywhere in this work.

## Failure modes and the one limitation I cannot verify

While building the harness, I deliberately tried to break my own tooling,
not just the engine. One attempt succeeded: a stub that returned a
technically well-shaped result — the right top-level fields present — but
with no actual classification trace behind it, and the harness issued
confident verdicts anyway. That's a real defect, now fixed: the harness
requires the sponsorship trace to actually exist before it will conclude
anything.

A second attempt targeted the fix itself rather than the harness: the
negation-aware patch only checks for a negation word immediately *before*
a matched token. Move the negation *after* the token — "US citizen? Not
anymore, I need sponsorship now" — and the patch still misclassifies it.
I'm reporting this rather than chasing it with another regex rule, because
each additional rule just moves the same fragility to a different word
order; the honest boundary is more useful than an illusion of complete
coverage.

**The limitation I cannot verify**: whether these fixtures represent the
full range of how real candidates describe their status. This harness
proves a mechanism on a small, fictional set I wrote. It does not, and
cannot, show how the classifier behaves on the actual variety of language
real OPT and STEM-OPT candidates use — that would require real candidate
text I am not in a position to collect or commit.

## Demo

The full run — detect (RED, 3/6), verify (GREEN, 0/6), both break attempts,
and the negation-placement probe — is archived as real terminal output, not
paraphrased, in the PR's `runs/` directory and referenced term-by-term in
the attestation.
