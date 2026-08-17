#!/usr/bin/env node
// Deliberately broken stub for break-attempt 2: exits 0 (looks successful!)
// but writes an empty/malformed role-scores.json — simulates a silent
// partial failure (e.g. disk full mid-write, a caller that swallowed an
// exception and wrote {} anyway).
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const oi = args.indexOf('--out-dir');
const outDir = oi >= 0 ? args[oi + 1] : '.';
fs.mkdirSync(outDir, { recursive: true });
// Write a technically-valid JSON file that is missing the required fields.
fs.writeFileSync(path.join(outDir, 'role-scores.json'), JSON.stringify({ status: "ok" }));
console.log("✓ scored 1 roles (fake success message)");
process.exit(0);
