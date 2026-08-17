#!/usr/bin/env node
// Break-attempt 3: exits 0, writes a JSON that satisfies the harness's
// current top-level guard (profile_needs_sponsorship is a real boolean,
// roles[] is non-empty) but the role object itself has NO trace at all —
// simulates a caller/version-drift where the trace shape changed but the
// top-level fields stayed the same.
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const oi = args.indexOf('--out-dir');
const outDir = oi >= 0 ? args[oi + 1] : '.';
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'role-scores.json'), JSON.stringify({
  profile_needs_sponsorship: true,   // happens to match ground truth for cases 3-6, NOT for 1-2
  config: { weights: {} },           // no role_quality field at all
  roles: [ { role_id: "x", company: "x", title: "x" } ]  // NO trace object at all
}));
console.log("✓ scored 1 roles");
process.exit(0);
