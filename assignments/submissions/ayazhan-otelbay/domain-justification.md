# Domain Justification — PM / International / H-1B / Cognitive Pivot

**By:** Ayazhan Otelbay · 2026-07-06

## Who uses this mode, and in what exact situation

An international Product Manager on an OPT, STEM-OPT-extension, or H-1B track,
actively applying to PM roles in the US (Bay Area focus), who has gathered a batch
of postings during a week of search and needs to triage which are worth the time
to tailor a resume and write outreach for, before spending that time.

## What information asymmetry it addresses

A US-based PM candidate can often get a read on a posting's real status and a
company's sponsorship posture through their existing network — a former
colleague at the company, a referral, LinkedIn connections who already work
there. An international candidate on a visa clock frequently lacks that network,
so they cannot easily see: (1) whether a posting is actually still accepting
applications or is a stale listing left up for pipeline-building, and (2) whether
a company has ever actually sponsored an H-1B for a role like this one, as
opposed to listing "visa sponsorship available" in a job description with no
track record behind it. This mode makes both of those signals checkable before
time is spent, rather than assumed from the posting's own language.

## Connection to engine layers

- **Job-Ops** — the liveness gate (`ats:liveness`) is a direct Job-Ops check:
  is this posting real, right now.
- **80 Days to Stay** — the sponsorship-history gate reads the repo's existing
  H-1B/company-mapped data to check track record, not stated intent.
- **The Cognitive Pivot** — the role-quality score is meant to flag PM roles
  more oriented toward system judgment and less toward tasks an LLM can already
  do (drafting specs, summarizing user feedback), though this is currently
  approximate for PM titles pending the SOC-crosswalk TODO.

## Failure modes specific to this domain

1. **Aggregator blind spot.** A posting surfaced only through LinkedIn (rather
   than a direct Greenhouse/Lever/Ashby link) frequently returns `uncertain`
   from the liveness check, not because the job is dead but because LinkedIn's
   page structure hides the underlying Apply control from an automated check
   (confirmed directly in the Worked Run below). The shape of this error is a
   false sense of "nothing to check" rather than a false positive or negative —
   the mode simply cannot see the signal, and says so. This is hardest to catch
   for a candidate who does not know to look for the company's own careers page
   or the direct ATS link, and who might otherwise read "uncertain" as "probably
   fine" and skip real due diligence.

2. **Historical sponsorship read as future sponsorship.** The H-1B sponsorship
   dataset is backward-looking: a company that sponsored two years ago may have
   frozen sponsorship since (common after layoffs or funding downturns), and a
   company with zero sponsorship history may still be willing to sponsor a
   sufficiently strong candidate for a first case. The shape of this error is
   treating a historical count as a live guarantee. This is hardest to catch for
   a candidate early in their search who has not yet learned that H-1B policy
   can change company-by-company and year-by-year, and who may over-trust a
   nonzero historical count or over-discount a company simply because it has
   no history yet.