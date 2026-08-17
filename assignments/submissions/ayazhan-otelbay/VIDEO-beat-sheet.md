# Explainer video — beat sheet
Capstone: sponsorship-wording-harness · target length 3:30–4:30

Required by the assignment: at least one unscripted, uncut segment showing
a live terminal run — real command, real output appearing in real time, no
cut inside the take. If it errors on camera, leave it in and narrate the
fix.

---

## Act 1 — The domain and the asymmetry (~40s)

**Visual:** talking head or title card, no terminal yet.

**Say (your own words, not read verbatim — this is the beat, not a script
to memorize):**
- An OPT/STEM-OPT candidate has one clock and one number that should
 dominate every other signal: does this employer sponsor. Everything else
 — fit, brand, role quality — is secondary to that.
- The Reallocation Engine's Bayesian Role Scorer knows this — it weights
 sponsorship at 0.35, above fit at 0.30 — but that weighting is only as
 good as whether the system correctly reads whether YOU need sponsorship
 in the first place.
- If it misreads that, the whole careful weighting scheme is pointed at
 the wrong number.

---

## Act 2 — The finding, stated plainly (~35s)

**Visual:** show the regex line from `applyProfile()` on screen (a
screenshot or a quick editor view is fine here — this part CAN be cut/edited).

**Say:**
- The classifier reads free text against a list of tokens. One of them is
 "authorized."
- An OPT candidate who accurately writes "employment authorized under
 OPT" — standard I-765 language — gets read as NOT needing sponsorship.
- The system then treats every employer as if visa status doesn't matter,
 for exactly the candidates it exists to protect.

---

## Act 3 — THE UNCUT LIVE RUN, pre-fix (RED) (~50–70s)

**This is the graded core. No cuts inside this take.**

**Visual:** real terminal, real screen recording, your actual voice
narrating as it runs.

**Do, live, on camera:**
```
node scripts/score/sponsorship-wording-harness.mjs --mode=detect
```

**While it runs / right after, say out loud (don't just read — react to
what you're actually seeing):**
- point at case1/case2 — PASS, correct
- point at case3, case4, case5 — BUG, and read one of the actual fixture
 strings on screen out loud
- point at the exit code at the end — this is what makes it CI-gatable,
 not just a report

If anything looks different from what you expect on camera — say so out
loud and keep rolling. That's more honest than a clean take.

---

## Act 4 — The fix (~25s)

**Visual:** can be edited/cut — show the diff or just describe it.

**Say:**
- The fix does two things: drops the bare "authorized" token from the
 exemption pattern, and adds negation-aware matching so "not a citizen"
 isn't read as "citizen."
- It touches nothing else — role_quality, the gates, the composite
 formula are all untouched.

---

## Act 5 — THE UNCUT LIVE RUN, post-fix (GREEN) (~40–50s)

**Also uncut, same rules as Act 3.**

**Do, live, on camera:**
```
node scripts/score/sponsorship-wording-harness.mjs --mode=verify --engine=scripts/score/role-scorer.patched.mjs
```

**Say:**
- same 6 fixtures, all PASS now, exit code 0
- point out that case1/case2 (the correct non-sponsor cases) are STILL
 correct — the fix didn't break the other direction

---

## Act 6 — One thing I learned (~30–40s)

**Visual:** talking head, or terminal showing the break-attempt-2 output.

**Say (pick the real moment, don't paraphrase it into something more
dramatic than it was):**
- While trying to break my own harness, I found a real bug in the harness
 itself, not the engine: a broken stub could satisfy the top-level checks
 but carry no real classification trace, and the harness issued confident
 verdicts anyway.
- I fixed that — the harness now requires the actual trace to be present
 before it concludes anything.
- The lesson: the tool that's supposed to catch a lie can lie itself if
 you don't specifically test it for that.

---

## Act 7 — One honest limitation (~25–35s)

**Visual:** terminal showing the negation-placement probe output, or
talking head.

**Say:**
- The fix only checks for negation immediately BEFORE the matched token.
 Move it after — "US citizen? Not anymore, I need sponsorship now" — and
 it's still wrong.
- I didn't patch that further. Chasing every word order with more regex
 is the same fragile approach that caused the original bug. The honest
 move is naming the boundary, not pretending the fix covers more than it
 does.

---

## Act 8 — Close (~15–20s)

**Say:**
- Full attestation, run logs, and break-attempt output are in the PR.
- [Title/repo link on screen]

---

## Recording checklist before you start

- [ ] Terminal font size large enough to read on a recording
- [ ] `cd` into the repo root before hitting record, so commands are short
 and clean
- [ ] Do a silent dry run once first (not recorded) just to make sure the
 commands work in your actual environment — the ACTUAL recorded take
 should still be a genuine live run, not a replay, but you want to know
 ahead of time that node/paths are set up correctly
- [ ] No real PII, no real employer/candidate data on screen anywhere —
 everything here is fictional fixtures, which is true and safe to show
- [ ] Acts 3 and 5 must be uncut, real-time, single takes — if you flub a
 line, keep going or start that act's take over entirely, don't cut mid-take
