#!/usr/bin/env node
/**
 * Fail CI if Soft/DAT provider strings or obvious secrets appear in client app UI.
 */
import fs from "node:fs";
import path from "node:path";

const roots = ["app", "components"];
const banned = [
  /Laneora Soft/i,
  /(?:^|[^-\w])Soft:\s/i, // avoid CSS vars like --green-soft:
  /DAT GraphQL/i,
  /freight\.api\.dat\.com/i,
  /indus1234/,
  /LANEORA_PASSWORD\s*=\s*['"][^'"]+['"]/,
  /SOFT_PASSWORD\s*=\s*['"][^'"]+['"]/,
];
const allowPath = /node_modules|\.next|globals-tokens/;

let failed = false;
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (allowPath.test(full)) continue;
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full);
    else if (/\.(tsx|ts|jsx|js|css|mdx)$/.test(name)) check(full);
  }
}

function check(file) {
  const text = fs.readFileSync(file, "utf8");
  for (const re of banned) {
    if (re.test(text)) {
      console.error(`SOFT_LEAK ${file} matches ${re}`);
      failed = true;
    }
  }
}

for (const root of roots) walk(root);
if (failed) process.exit(1);
console.log("ci-soft-leak-lint: ok");
