#!/usr/bin/env node
// role-scorer.patched.mjs — role-scorer.mjs with ONE function changed:
// applyProfile(). Every other line is byte-identical to the original
// scripts/score/role-scorer.mjs. This file exists so the harness can run
// --mode=verify against it without touching the vendored original in place;
// PROPOSED-FIXES.md documents this as a diff to be applied to the real file
// in the PR, not a parallel reimplementation to keep around long-term.
//
// THE FIX (closes case3/case4/case5 of sponsorship-wording-harness.mjs):
//
// 1. Removed the bare token "authorized" from the exemption pattern.
//    Standard I-765 OPT phrasing ("employment authorized under OPT")
//    legitimately contains "authorized" while the candidate still needs
//    sponsorship to continue working after OPT ends. "authorized" must
//    never, by itself, imply "does not need sponsorship."
//
// 2. Added negation-aware matching. A negation word within 3 tokens before
//    a matched exemption token flips the read — "not a US citizen" must not
//    be read as "citizen."
//
// What this fix deliberately does NOT do: it does not touch role_quality,
// does not touch the composite formula, does not touch the gate logic. It
// changes exactly the sponsorship-classification surface the harness targets.

import fs from 'node:fs';
import path from 'node:path';

const CONFIG = {
  weights: {
    sponsorship: 0.35,
    fit: 0.30,
    role_quality: 0.0,   // unchanged — still [VERIFY], still reported not fixed
  },
  apply_threshold: 0.30,
  consider_floor: 0.20,
  gate_zero: 0.05,
  soft_sponsorship_tiers: ['likely', 'possible', 'unknown'],
};

const SRC = { record: 'record', model: 'model-judgment', input: 'your-input' };

// ── PATCHED applyProfile() ────────────────────────────────────────────────
function applyProfile(weights, profile) {
  const w = { ...weights };
  const auth = (profile?.authorization || '').toLowerCase();

  // FIX 1: "authorized" removed from the exemption pattern (see header).
  const EXEMPTION_TOKEN = /citizen|permanent resident|green card|\bgc\b|\bpr\b|no.?sponsor(ship)?\s*(needed|required)?/;

  // FIX 2: negation-aware match — a negation word in the 3 tokens
  // immediately preceding the matched exemption token flips the read.
  const NEGATION = /\b(not|isn'?t|never|no longer|doesn'?t|don'?t)\b/;

  let matchedExemption = false;
  const m = EXEMPTION_TOKEN.exec(auth);
  if (m) {
    const before = auth.slice(0, m.index);
    const lastThreeWords = before.trim().split(/\s+/).slice(-3).join(' ');
    const negated = NEGATION.test(lastThreeWords);
    matchedExemption = !negated;
  }

  const needsSponsor = profile == null ? true : !matchedExemption;
  if (!needsSponsor) w.sponsorship = 0;
  return { w, needsSponsor };
}

const num = (x) => (typeof x === 'number' && isFinite(x) ? x : null);
const fmt = (x) => (x == null ? '—' : Number(x).toFixed(3));

function scoreRole(role, weights, needsSponsor) {
  const votes = [];
  const push = (key, obj, defSrc) => {
    const p = num(obj?.p);
    if (p == null) return;
    votes.push({ key, p, weight: weights[key] ?? 0, source: obj.source || defSrc });
  };
  push('sponsorship', role.sponsorship, SRC.record);
  push('fit', role.fit, SRC.model);
  push('role_quality', role.role_quality, SRC.record);

  const voteSum = votes.reduce((s, v) => s + v.p * v.weight, 0);

  const liveness = num(role.liveness?.factor) ?? 1;
  const timeline = num(role.timeline?.factor) ?? 1;
  const gates = [
    { key: 'liveness', factor: liveness, source: role.liveness?.source || SRC.record },
    { key: 'timeline', factor: timeline, source: role.timeline?.source || SRC.input },
  ];
  const gateProduct = gates.reduce((s, g) => s * g.factor, 1);
  const composite = voteSum * gateProduct;

  const closedGate = gates.find((g) => g.factor <= CONFIG.gate_zero);
  let rec, reason;
  if (closedGate) {
    rec = 'Skip';
    reason = `gated: ${closedGate.key} ≈ ${fmt(closedGate.factor)} (a closed gate zeroes the composite regardless of votes)`;
  } else if (composite >= CONFIG.apply_threshold) {
    const tier = (role.sponsorship?.tier || '').toLowerCase();
    const softSponsor = needsSponsor && tier && CONFIG.soft_sponsorship_tiers.includes(tier);
    const softTimeline = timeline < 0.6;
    if (softSponsor || softTimeline) {
      rec = 'Consider';
      reason = `above threshold (${fmt(composite)}) but one soft spot: ${softSponsor ? `sponsorship tier "${role.sponsorship.tier}"` : `timeline ${fmt(timeline)}`}`;
    } else { rec = 'Apply'; reason = `composite ${fmt(composite)} ≥ ${CONFIG.apply_threshold}, gates healthy`; }
  } else if (composite >= CONFIG.consider_floor) {
    rec = 'Consider';
    reason = `composite ${fmt(composite)} in the Consider band [${CONFIG.consider_floor}, ${CONFIG.apply_threshold})`;
  } else {
    rec = 'Skip';
    reason = `composite ${fmt(composite)} < ${CONFIG.consider_floor} — time is better spent elsewhere`;
  }

  let overridden = null;
  if (role.override && role.override.decision) {
    if (!role.override.reason || !String(role.override.reason).trim())
      overridden = { ...role.override, _warning: 'override WITHOUT a documented reason — ignored (Ch.11: that is just ignoring the math)' };
    else { overridden = role.override; }
  }

  return {
    role_id: role.role_id ?? null,
    company: role.company ?? null,
    title: role.title ?? null,
    composite: Number(composite.toFixed(4)),
    recommendation: overridden && overridden.reason ? overridden.decision : rec,
    machine_recommendation: rec,
    reason,
    override: overridden,
    trace: {
      votes: votes.map((v) => ({ factor: v.key, value: v.p, weight: v.weight, contribution: Number((v.p * v.weight).toFixed(4)), source: v.source })),
      vote_sum: Number(voteSum.toFixed(4)),
      gates: gates.map((g) => ({ factor: g.key, multiplier: g.factor, source: g.source })),
      gate_product: Number(gateProduct.toFixed(4)),
      arithmetic: `(${votes.map((v) => `${v.p}·${v.weight}`).join(' + ') || '0'}) × ${gates.map((g) => g.factor).join(' × ')} = ${fmt(composite)}`,
    },
  };
}

function renderMarkdown(scored, meta) {
  const o = [];
  o.push(`# Role Scorer report — ${meta.when}`);
  o.push(`\n*Bayesian Role Scorer (Ch.11), PATCHED applyProfile(). Weights: sponsorship ${meta.w.sponsorship}, fit ${meta.w.fit}, role_quality ${meta.w.role_quality} [role_quality weight is **[VERIFY]** — not pinned by the chapter, UNCHANGED by this fix]. Threshold ${CONFIG.apply_threshold}. ${meta.needsSponsor ? 'Profile requires sponsorship.' : 'Profile does NOT require sponsorship → sponsorship weight 0.'}*\n`);
  const by = (r) => scored.filter((s) => s.recommendation === r);
  o.push(`**Summary:** ${scored.length} roles → Apply ${by('Apply').length} · Consider ${by('Consider').length} · Skip ${by('Skip').length}. **Skip rate ${(by('Skip').length / scored.length * 100).toFixed(0)}%**.`);
  o.push('\n| Role | Composite | Rec | Why | Audit (term · value · weight · source) |');
  o.push('|---|---|---|---|---|');
  for (const s of scored.sort((a, b) => b.composite - a.composite)) {
    const audit = s.trace.votes.map((v) => `${v.factor} ${v.value}·${v.weight} [${v.source}]`).join('; ') +
      ` × ` + s.trace.gates.map((g) => `${g.factor} ${g.multiplier}[${g.source}]`).join('×');
    const recCell = s.override && s.override.reason ? `${s.recommendation} ⟵ override` : s.recommendation;
    o.push(`| ${s.company || ''} — ${s.title || s.role_id || ''} | ${fmt(s.composite)} | **${recCell}** | ${s.reason} | ${audit} |`);
  }
  o.push('\n*Every term traces to its source. If you cannot explain a row term-by-term, distrust the recommendation before your confusion (Ch.11).*');
  return o.join('\n') + '\n';
}

function main() {
  const args = process.argv.slice(2);
  const src = args.find((a) => !a.startsWith('--'));
  if (!src || !fs.existsSync(src)) { console.error('Usage: role-scorer.patched.mjs <roles.json> [--profile p.json] [--out-dir dir] [--md report.md]'); process.exit(2); }
  const pi = args.indexOf('--profile'); const profile = pi >= 0 ? JSON.parse(fs.readFileSync(args[pi + 1], 'utf8')) : null;
  const oi = args.indexOf('--out-dir'); const outDir = oi >= 0 ? args[oi + 1] : path.dirname(src);
  const mi = args.indexOf('--md'); const mdOut = mi >= 0 ? args[mi + 1] : path.join(outDir, 'role-scores.md');

  let roles = JSON.parse(fs.readFileSync(src, 'utf8'));
  if (!Array.isArray(roles)) roles = roles.roles || [];

  const { w, needsSponsor } = applyProfile(CONFIG.weights, profile);
  const scored = roles.map((r) => scoreRole(r, w, needsSponsor));

  const meta = { when: new Date().toISOString().slice(0, 10), w, needsSponsor };
  fs.mkdirSync(outDir, { recursive: true });
  const jsonOut = path.join(outDir, 'role-scores.json');
  fs.writeFileSync(jsonOut, JSON.stringify({ _scorer: 'bayesian-role-scorer-PATCHED', _chapter: 11, generated: meta.when, config: CONFIG, profile_needs_sponsorship: needsSponsor, roles: scored }, null, 2));
  fs.writeFileSync(mdOut, renderMarkdown(scored, meta));

  const by = (r) => scored.filter((s) => s.recommendation === r).length;
  console.log(`✓ scored ${scored.length} roles → Apply ${by('Apply')} · Consider ${by('Consider')} · Skip ${by('Skip')} (skip ${(by('Skip') / scored.length * 100).toFixed(0)}%)`);
  console.log(`  ${path.relative(process.cwd(), jsonOut)}  +  ${path.relative(process.cwd(), mdOut)}`);
  for (const s of scored) if (s.override?._warning) console.warn(`  ! ${s.company}: ${s.override._warning}`);
}

main();
