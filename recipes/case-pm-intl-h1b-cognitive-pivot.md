---
status: RUNNABLE-SAMPLE
todos_open: 2
last_gate: "sample-run, 2026-07-06, logs/RUN_LOG.md#2026-07-06"
attestation: null
recipe_version: 0.1.0
---

# case-pm-intl-h1b-cognitive-pivot

## Purpose

For an international Product Manager (F-1/OPT/STEM OPT/H-1B track) applying to PM
roles in the US, this mode filters candidate postings through three checks before
any application time is spent:

1. Is the posting still live and accepting applications? (gate)
2. Does the hiring company have a documented H-1B sponsorship history? (evidence)
3. Is the role's SOC classification resilient to near-term AI substitution,
   per the Cognitive Pivot role-quality score? (evidence)

Use this mode when triaging a batch of PM postings gathered in a week of search,
before spending time tailoring a resume or writing outreach.

## Source Inventory

| Check | Command / Path | Status |
|---|---|---|
| Posting liveness | `npm run ats:liveness -- <job-url>` | Runnable today |
| ATS provider scan | `npm run ats:scan -- --dry-run` | Runnable today |
| Composite role score (sponsorship × liveness × timeline × role quality) | `npm run score <roles.json>` (`scripts/score/role-scorer.mjs`) | Runnable today |
| H-1B sponsorship history data | `data/80-days-to-stay/` | Existing repo data — read only |
| BLS/O*NET role-quality data | `data/bls/compact/` | Existing repo data — read only |

## Proposed additions

- **[TODO: DATA SOURCE]** A PM-specific SOC crosswalk (SOC 11-2021, "Marketing Managers,"
  is the closest existing BLS code but does not cleanly cover Product Management titles).
  Closed by: human, once a mapping file is added at `data/bls/compact/pm-soc-crosswalk.json`
  with a one-line provenance note.
- **[TODO: DEFINE]** A profile-conditional sponsorship weight for candidates on OPT vs.
  H-1B vs. STEM-OPT-extension timelines, since urgency differs by visa stage. Closed by:
  human, with one sentence of reasoning, before this mode reaches VERIFIED.

## Phase gates

| Gate | Condition | Cleared by |
|---|---|---|
| Liveness gate | `ats:liveness` returns `active`, not `expired` or `uncertain` | Named human, logged |
| Sponsorship gate | Company appears in `data/80-days-to-stay/` with a non-empty H-1B history | Named human, logged |
| Timeline gate | Application deadline / typical time-to-offer for this ATS provider does not exceed remaining OPT/visa runway | Named human, logged (currently manual — no script computes this yet) |

Liveness and sponsorship are treated as gates, not votes, per the repo's founding
principle: an inactive posting or a zero-sponsorship-history company stops the
pipeline for that role regardless of how well it scores otherwise.

## What this mode can and cannot verify

**Can verify:**
- Whether a posting hosted directly on a known ATS (Greenhouse, Lever, Ashby) is live.
- Whether a company appears in the repo's existing H-1B sponsorship dataset.
- A composite role-quality score for roles with a matching BLS/O*NET SOC code.

**Cannot verify:**
- Liveness of postings surfaced only through aggregators like LinkedIn — the aggregator's
  page structure often hides the underlying "Apply" control from an automated check,
  producing an `uncertain` result rather than a false `active`/`expired` (confirmed in
  the Worked Run below).
- Whether a company's *past* H-1B sponsorship predicts *future* sponsorship for a new hire —
  the dataset is historical, not predictive.
- PM-specific role quality with precision, until the SOC crosswalk TODO above is closed —
  the current BLS mapping is an approximation for PM titles, not an exact match.

## Output Contract

**Agent log** (`logs/oferta-<date>.json`-style, machine-readable): one record per
posting evaluated, with fields `url`, `liveness_status`, `sponsorship_history`,
`role_quality_score`, `gate_results`, `verified` (bool per field) or `inferred` (bool
per field).

**Human report** (Markdown table, `reports/generated/pm-h1b-<date>.md`): one row per
posting — Company | Role | Liveness | Sponsorship history | Role-quality score |
Recommendation (Apply / Consider / Skip) | Notes. Written for the candidate, not the agent.

## Stop conditions

- If `ats:liveness` returns `uncertain`, the mode does not guess an Apply/Skip
  recommendation from other signals alone — it flags the posting for manual check
  (open the link, look for the Apply button by hand) before scoring proceeds.
- If a company is absent from the H-1B sponsorship dataset, the mode does not infer
  sponsorship likelihood from company size, industry, or funding stage — it reports
  "no sponsorship history found" and stops at that gate.
- If the SOC crosswalk TODO is still open, the mode reports the role-quality score
  with an explicit "approximate SOC match" label rather than a bare number.

## Log template — `logs/RUN_LOG.md`

```
### 2026-07-06 — case-pm-intl-h1b-cognitive-pivot (sample run)
- Recipe: case-pm-intl-h1b-cognitive-pivot v0.1.0
- Inputs: 1 posting URL (LinkedIn aggregator link)
- Commands run: `npm run verify`; `npm run ats:liveness -- <url>`
- Output: verify passed (131 files conform, 4 non-blocking manifest warnings);
  liveness check returned `uncertain` — "content present but no visible apply
  control found" (0 active, 0 expired, 1 uncertain)
- Result: liveness gate did not clear; role not scored further per stop conditions
- Open issues: SOC crosswalk TODO open; role-scorer not yet run against a real
  roles.json for this domain; sponsorship-gate check not yet run against real data
```
