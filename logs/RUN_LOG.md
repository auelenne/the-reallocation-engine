# logs/RUN_LOG.md — Setup Exercise Run Log

Date: 2026-06-24
Student: Ayazhan Otelbay
Course: INFO 7375 — Computational Skepticism for AI
Exercise: Setup Exercise — Your Search's Personal Layer

---

## What Was Built

Three files created in search/ folder:

1. search/resume.json — attested record of past experience, skills, credentials
2. search/profile.yml — target role, visa constraints, search preferences
3. search/gaps.md — delta between current evidence and target role requirements

---

## Verification Checklist

### resume.json: Is every job entry traceable to something verifiable?
Yes. All job entries (Qazpost, UXStone LLP) are traceable to real positions held. Dates, titles, and achievements reflect actual work. Three agent errors were caught and corrected during attestation pass: (1) employment type "full-time" for UXStone was incorrect — removed; (2) fabricated "problem_solved" field for banking services achievement — not in original resume, removed; (3) fabricated "problem_solved: Manual parcel processing inefficiency" for OCR project — cause of problem was not stated in original resume, removed. SQL skill was missing from resume.json despite being a real skill — added during this exercise.

### profile.yml: Does the visa constraint section reflect actual documents?
Yes. F-1 status is current and accurate. Authorization end date of 2028 reflects actual program end date (Northeastern University Information Systems, 2026–2028). STEM eligibility confirmed with DSO at Northeastern — marked true. Sponsorship requirement is accurate — H-1B sponsorship is required to remain in the US after OPT period.

### gaps.md: Does every gap in the evidence column cite something real?
Yes. Every gap cites a specific job posting with company name and date — all postings were identified and selected by the student (TikTok LIVE, Tesla, Sweatpals, Notion — June 2026). No gap is sourced from agent inference or general assumption. One agent-generated gap ("No Agile experience in US tech") was killed because it was based on a generic assumption, not a specific posting requirement — Agile is documented in resume.json and was used at Qazpost with a 9-person team.

---

## Top Gap from gaps.md

The most critical gap is not a skill gap but a context gap. My three years of PM experience at Qazpost are real and measurable, but US hiring managers have no reference point for the Kazakhstan market. The top gap is the absence of US market signal in my portfolio — no US user research, no English-language PRDs, no network of US PMs who can vouch for the quality of my work. This gap cannot be closed by taking a course. It closes when I ship something visible to US audiences and build relationships with people who understand what strong PM work looks like in this market.

---

## Row Killed and Why

Killed row: "No experience with Agile in US tech environment"
Reason: Agent generated this from a generic assumption that US companies use Agile differently. This is not grounded in any specific posting requirement. Agile (Scrum, Kanban) is documented in resume.json and was practiced daily at Qazpost leading a 9-person cross-functional team. None of the three job postings I reviewed (TikTok, Tesla, Sweatpals) mentioned Agile as a requirement. The gap does not apply to my actual situation.

---

## Field Corrected in profile.yml

STEM eligibility field — agent initially marked as "uncertain" pending DSO confirmation. Confirmed with Northeastern DSO during this exercise — changed to true. This matters because STEM OPT provides 3 years of work authorization instead of 1, which directly affects which companies will consider sponsoring.

---

## AI Use Disclosure

Agent used: Claude (Anthropic)

Agent role: extracted resume data into JSON format, drafted profile.yml from intake questions, drafted initial gap table based on student-selected job postings, suggested initial gap list.

Student role: ran attestation pass on resume.json and found 3 errors; corrected all three; confirmed SQL skill missing from resume and added it; answered profile questions with facts not aspirations; confirmed STEM eligibility with DSO; identified and provided all target job postings (TikTok LIVE, Tesla, Sweatpals, Notion); killed one agent-generated gap row with written explanation; rewrote one gap row in own words; selected final two gaps as most relevant to Bay Area PM market.

What the agent could not do: verify whether my experience was accurate, know my actual visa status, know whether Gov.kz work included compliance or was UX-only, know that SQL was missing from my resume despite being a real skill, determine which gaps were actually relevant to my situation.
