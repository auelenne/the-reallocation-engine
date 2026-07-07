(Prerequisite step run once before this: `npx playwright install`, since Playwright's
browser binaries were not yet downloaded on this machine. Output omitted here — browser
download only, no domain-relevant result.)

## Verified vs. inferred

| Claim | Status | Source |
|---|---|---|
| Repository conforms (131 files, valid JSON/YAML/JS) | **Verified** | `npm run verify` output above |
| 4 manifest warnings exist, none blocking | **Verified** | `npm run verify` output above |
| The LinkedIn posting's liveness is "uncertain" (not active, not expired) | **Verified** | `npm run ats:liveness` output above |
| The reason liveness is uncertain is that LinkedIn hides its Apply control from automated checks | **Inferred** — the tool's own message states this reason directly ("no visible apply control found"); I did not independently inspect the page's DOM to confirm the mechanism, only accepted the tool's stated reason |
| This posting's company H-1B sponsorship history | **Not yet checked** — sponsorship-gate script was not run against this posting in this session; the mode's design covers this step but this run did not exercise it |
| This posting's Cognitive-Pivot role-quality score | **Not yet computed** — `npm run score` requires a `roles.json` input file in a specific schema that was not built in this session; role-scoring was not exercised in this run |

## Attestation

- Recipe: case-pm-intl-h1b-cognitive-pivot v0.1.0
- By: Ayazhan Otelbay · 2026-07-06

### Tested

| Ran | Saw | Expected |
|---|---|---|
| `npm run verify` | conformance passed (131 files), manifest check passed with 4 non-blocking warnings | Expected a pass, since no files had been edited outside the new recipe/justification/worked-run files |
| `npm run ats:liveness -- <linkedin-url>` | `uncertain`, "content present but no visible apply control found" | Expected either `active` or `uncertain` for an aggregator link, since the repo's own docs describe liveness checks as tuned to direct ATS providers (Greenhouse/Lever/Ashby), not aggregators |
| Deliberate break attempt: ran `npm run score` with **no arguments**, to see how the script fails | Script printed its usage string and exited without a stack trace: `Usage: role-scorer.mjs <roles.json> [--profile p.json] [--out-dir dir] [--md report.md]` | Expected either a crash or a helpful usage message; the script produced a clean usage message, which is a better failure mode than a silent wrong answer |

### Did not test

- Liveness check against a posting hosted directly on Greenhouse/Lever/Ashby (I could
  not locate a live PM posting on those boards in the time available for this run) —
  so I have not yet confirmed the tool returns a clean `active`/`expired` result on a
  direct-ATS link, only that it returns `uncertain` on an aggregator link.
- The sponsorship-history gate (`data/80-days-to-stay/`) against this or any real
  company.
- The role-scorer (`npm run score`) against a real `roles.json` built for a PM role —
  the schema this script expects was not constructed in this session.
- Behavior of `ats:liveness` against a genuinely expired/removed posting, to confirm
  it correctly returns `expired` rather than `uncertain`.

### Broke during testing, fixed

- `ats:liveness` initially failed with `Fatal: browserType.launch: Executable doesn't
  exist` because Playwright's browser binaries were not installed. Fixed by running
  `npx playwright install`, which downloaded Chromium, Firefox, WebKit, and FFmpeg;
  re-ran the command successfully afterward.

## Reflection

What went well: the liveness gate behaved exactly as the mode's "what it cannot
verify" section predicted — I wrote that section *before* running the check against
a real LinkedIn URL, based on reasoning about how aggregators structure their pages,
and the real run confirmed it. `npm run verify` is a solid, fast conformance check to
run before and after any change.

What the mode got wrong or missed: I designed three gates (liveness, sponsorship,
timeline) but this session's real run only exercised one of them (liveness). The
sponsorship gate and the role-quality score remain **untested against real data** —
the mode is honestly at RUNNABLE-SAMPLE, not further, because "sample" here means one
gate sampled, not all three.

Next steps: (1) find a PM posting on a direct ATS link (Greenhouse/Lever/Ashby) to
confirm the liveness check's `active` path, not just its `uncertain` path; (2) build
a minimal `roles.json` for 1-2 real PM postings and run `npm run score` against it to
exercise the sponsorship and role-quality gates for the first time; (3) close the SOC
crosswalk TODO before treating role-quality output as anything more than approximate.## Second run — role-scorer against the book's verified fixture

To close the gap flagged above (role-scorer untested), I ran `npm run score`
against the repo's own Ch.11 example fixture, since no PM-specific `roles.json`
existed yet for this domain — this let me exercise the sponsorship and
role-quality gates for the first time, using data already verified by the repo
maintainer against the book (per `DOMAIN.md`, item 3).
## Third run — role-scorer against a real PM posting (with an illustrative contrast case)

To exercise the sponsorship and role-quality gates against domain-specific data
(not just the repo's biotech fixture above), I built `data/examples/pm-roles.json`
with two entries: one real posting I am currently evaluating, and one clearly
labeled illustrative case for contrast — not a live posting.
$ npm run score data/examples/pm-roles.json

> the-reallocation-engine@1.0.0 score
> node scripts/score/role-scorer.mjs data/examples/pm-roles.json

✓ scored 2 roles → Apply 1 · Consider 0 · Skip 1 (skip 50%)
  data/examples/role-scores.json  +  data/examples/role-scores.m| Role | Composite | Rec | Why |
|---|---|---|---|
| Illustrative example — known multi-year sponsor, PM permanent | 0.457 | **Apply** | composite >= 0.3, gates healthy |
| Insight Global — Junior PM (AI-Focused), contract, real posting | 0.157 | **Skip** | composite 0.157 < 0.2 — time is better spent elsewhere |

## Verified vs. inferred — third run

| Claim | Status | Source |
|---|---|---|
| Insight Global does not appear in `data/80-days-to-stay/` | **Verified** | `grep -ril "insight global" data/80-days-to-stay/` returned zero results |
| Insight Global is a staffing agency, not the end employer | **Verified** — stated directly in the job posting text I was evaluating, not inferred |
| The `sponsorship: 0.0` value I assigned to this posting | **Inferred by me** — I chose 0.0 because the agency has no sponsorship record and the role is a 6-month contract, which structurally reduces new-hire sponsorship likelihood; this is my judgment, not a value the tool looked up |
| The `fit: 0.75` and `role_quality: 0.6` values | **Inferred by me** — model-judgment labels in the input file itself; these are my assessment of the posting's requirements against a general PM skillset, not scored by any script |
| The illustrative comparison row's sponsorship value (0.85, "proven") | **Not a real record** — explicitly labeled illustrative in the company field; included only to show the gate's behavior on a contrasting case, not presented as evidence about a real employer |

This run directly demonstrates failure mode #1 from the Domain Justification:
an agency-posted listing obscures the real sponsoring entity, so a sponsorship-
history check against the agency's name returns nothing useful — not because
sponsorship data is missing from the repo, but because the check is being run
against the wrong entity. A candidate who does not know to look past the
staffing agency's name would get no signal at all here, correctly reflected as
`sponsorship: 0` rather than a false "no history" read on the actual employer.

**Still open:** the two input values I assigned by judgment (`sponsorship: 0.0`,
`fit: 0.75`, `role_quality: 0.6`) are not independently verified against a
second source — a more rigorous version of this mode would require finding the
actual end client behind the agency posting before scoring, rather than scoring
the agency-obscured version at all.
