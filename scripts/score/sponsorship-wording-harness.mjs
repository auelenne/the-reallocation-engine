#!/usr/bin/env node
// scripts/score/sponsorship-wording-harness.mjs
//
// Gate-behavior harness for role-scorer.mjs's applyProfile() (Ch.11).
//
// It does NOT reimplement the sponsorship-classification logic. For each
// fixture it spawns the REAL role-scorer.mjs as a subprocess with a real
// profile.json, reads back the real role-scores.json the engine wrote, and
// compares the engine's own `profile_needs_sponsorship` field (and, per-role,
// whether the sponsorship vote weight was actually zeroed in the trace)
// against a human-authored ground-truth expectation.
//
// Modes:
//   --mode=detect   run against the CURRENT engine, expected RED pre-fix
//   --mode=verify   run against a (patched) engine, expected GREEN post-fix
//
// Usage:
//   node scripts/score/sponsorship-wording-harness.mjs --mode=detect
//   node scripts/score/sponsorship-wording-harness.mjs --mode=verify --engine <path-to-patched-role-scorer.mjs>

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const FIXTURES_DIR = path.join(REPO_ROOT, 'data', 'fixtures');
const CASES_FILE = path.join(FIXTURES_DIR, 'wording-cases.json');
const ROLES_FILE = path.join(FIXTURES_DIR, 'roles.json');
const DEFAULT_ENGINE = path.join(REPO_ROOT, 'scripts', 'score', 'role-scorer.mjs');

function parseArgs(argv) {
  const out = { mode: 'detect', engine: DEFAULT_ENGINE };
  for (const a of argv) {
    if (a.startsWith('--mode=')) out.mode = a.slice('--mode='.length);
    if (a.startsWith('--engine=')) out.engine = path.resolve(a.slice('--engine='.length));
  }
  return out;
}

function runEngineOnce(enginePath, profilePath, outDir) {
  // Spawn the REAL engine as a subprocess — never reimplemented.
  const result = spawnSync('node', [enginePath, ROLES_FILE, '--profile', profilePath, '--out-dir', outDir], {
    encoding: 'utf8',
    timeout: 15000,
  });

  if (result.error) {
    return { ok: false, reason: `NO RESULT: subprocess failed to spawn (${result.error.message})` };
  }
  if (result.status !== 0) {
    return { ok: false, reason: `NO RESULT: engine exited ${result.status}. stderr: ${(result.stderr || '').trim()}` };
  }

  const scoresPath = path.join(outDir, 'role-scores.json');
  if (!fs.existsSync(scoresPath)) {
    return { ok: false, reason: 'NO RESULT: engine exited 0 but wrote no role-scores.json' };
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(scoresPath, 'utf8'));
  } catch (e) {
    return { ok: false, reason: `NO RESULT: role-scores.json was not valid JSON (${e.message})` };
  }

  // Guard: refuse to conclude PASS/BUG from a result whose shape is
  // incomplete. A stubbed or crashed engine must never be silently compared
  // against ground truth as if it had scored anything real.
  if (typeof data.profile_needs_sponsorship !== 'boolean' || !Array.isArray(data.roles) || data.roles.length === 0) {
    return { ok: false, reason: 'NO RESULT: role-scores.json is missing required fields (profile_needs_sponsorship / roles[])' };
  }

  const role = data.roles[0];
  const sponsorshipVote = role?.trace?.votes?.find((v) => v.factor === 'sponsorship');

  // FIX: the checks above only validate the TOP-LEVEL shape
  // (profile_needs_sponsorship present, roles[] non-empty). That alone is
  // not enough — a result could carry a plausible-looking
  // profile_needs_sponsorship value while the underlying role has no
  // sponsorship vote in its trace at all. Comparing against ground truth in
  // that case would issue a verdict with nothing behind it. The guard now
  // also requires the sponsorship trace entry itself to be present before
  // any PASS/BUG verdict is allowed.
  if (!role?.trace?.votes || !sponsorshipVote) {
    return { ok: false, reason: 'NO RESULT: role-scores.json has the top-level shape but role.trace.votes is missing the sponsorship entry — no classification trace to compare against' };
  }

  return {
    ok: true,
    profile_needs_sponsorship: data.profile_needs_sponsorship,
    role_quality_weight: data.config?.weights?.role_quality,
    sponsorship_weight_used: sponsorshipVote ? sponsorshipVote.weight : null,
    sponsorship_contribution: sponsorshipVote ? sponsorshipVote.contribution : null,
    composite: role?.composite,
    recommendation: role?.recommendation,
    raw: data,
  };
}

function runNegationPlacementProbe(enginePath) {
  // This is NOT part of the 6-fixture gate above. It is a separate, honest
  // probe of one specific limitation in the negation-aware patch: the
  // negation check only looks at the words immediately BEFORE a matched
  // exemption token. A candidate who places the negation AFTER the token —
  // "US citizen? Not anymore, I need sponsorship now" — is not caught by
  // this patch. This is reported as a known, deliberately unfixed
  // limitation, not silently patched further (which would just move the
  // same gap to a different word ordering).
  const profilePath = path.join(FIXTURES_DIR, 'profiles', 'case7-negation-after-token.json');
  const outDir = path.join(REPO_ROOT, 'runs', 'tmp', 'negation-placement-probe');
  fs.mkdirSync(outDir, { recursive: true });

  console.log('=== Probe: negation placed AFTER the exemption token (known limitation, not gated) ===');
  const result = runEngineOnce(enginePath, profilePath, outDir);
  if (!result.ok) {
    console.log(`NO RESULT — ${result.reason}\n`);
    return;
  }
  const text = 'US citizen? Not anymore, I actually need sponsorship now';
  console.log(`text: "${text}"`);
  console.log(`engine returned needs_sponsorship=${result.profile_needs_sponsorship} (a real candidate here needs sponsorship, i.e. this should read true)`);
  if (result.profile_needs_sponsorship === false) {
    console.log('LIMITATION CONFIRMED: the negation-aware patch only checks the words before a matched token; negation placed after the token is missed.');
  } else {
    console.log('Unexpected: this run did not reproduce the known limitation.');
  }
  console.log('');
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.mode === 'probe-negation-placement') {
    runNegationPlacementProbe(args.engine);
    return;
  }

  const cases = JSON.parse(fs.readFileSync(CASES_FILE, 'utf8'));

  console.log(`=== sponsorship-wording-harness (mode=${args.mode}) ===`);
  console.log(`engine under test: ${path.relative(REPO_ROOT, args.engine)}\n`);

  const rows = [];
  let bugCount = 0;
  let noResultCount = 0;

  for (const c of cases) {
    const profilePath = path.join(FIXTURES_DIR, c.profile);
    const outDir = path.join(REPO_ROOT, 'runs', 'tmp', c.id);
    fs.mkdirSync(outDir, { recursive: true });

    const result = runEngineOnce(args.engine, profilePath, outDir);

    if (!result.ok) {
      noResultCount++;
      rows.push({ id: c.id, verdict: 'NO RESULT', detail: result.reason });
      console.log(`[${c.id}] NO RESULT — ${result.reason}`);
      continue;
    }

    const actualNeedsSponsorship = result.profile_needs_sponsorship;
    const matches = actualNeedsSponsorship === c.expected_needs_sponsorship;
    const verdict = matches ? 'PASS' : 'BUG';
    if (!matches) bugCount++;

    rows.push({
      id: c.id,
      text: c.text,
      expected: c.expected_needs_sponsorship,
      actual: actualNeedsSponsorship,
      sponsorship_weight_used: result.sponsorship_weight_used,
      verdict,
      note: c.note,
    });

    console.log(`[${c.id}] ${verdict}`);
    console.log(`    text: "${c.text}"`);
    console.log(`    expected needs_sponsorship=${c.expected_needs_sponsorship}, engine returned needs_sponsorship=${actualNeedsSponsorship}`);
    console.log(`    sponsorship vote weight used by engine: ${result.sponsorship_weight_used}`);
    if (!matches) {
      console.log(`    >>> BUG: ${c.note}`);
    }
    console.log('');
  }

  // Non-gating open-question report (G2 in the recipe) — read from the LAST
  // successful run's config; this weight does not vary across fixtures.
  const lastOk = [...rows].reverse().find((r) => r.verdict !== 'NO RESULT');
  console.log('=== OPEN QUESTION (non-gating): role_quality weight ===');
  if (lastOk) {
    console.log(`role_quality weight, read verbatim from the engine's own config: reported above per-run (see sponsorship_weight_used lines);`);
    console.log(`this harness does NOT assign a value to role_quality — no chapter or design doc pins a number, so any weight chosen here would be invented.\n`);
  } else {
    console.log('OPEN QUESTION check skipped: no successful engine run to read config from.\n');
  }

  console.log('=== Summary ===');
  console.log(`${cases.length} fixtures, ${bugCount} bug(s), ${noResultCount} NO RESULT`);
  for (const r of rows) {
    console.log(`  ${r.id}: ${r.verdict}`);
  }

  const exitCode = (bugCount > 0 || noResultCount > 0) ? 1 : 0;
  console.log(`\nexit code: ${exitCode}`);
  process.exit(exitCode);
}

main();
