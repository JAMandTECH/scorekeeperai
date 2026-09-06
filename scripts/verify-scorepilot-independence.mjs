import { promises as fs } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const blocked = [
  /@base44\//i,
  /createClientFromRequest\([^)]*base44/i,
  /@base44\/sdk/i,
  /@base44\/vite-plugin/i,
];

const ignoredDirs = new Set(['node_modules', '.git', 'dist', 'base44']);

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (ignoredDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else if (/\.(js|jsx|ts|tsx|json|jsonc|mjs|cjs)$/.test(entry.name)) files.push(full);
  }
  return files;
}

const targets = [
  path.join(repoRoot, 'src'),
  path.join(repoRoot, 'package.json'),
  path.join(repoRoot, 'vite.config.js'),
];

let failures = [];
for (const target of targets) {
  const stat = await fs.stat(target);
  const files = stat.isDirectory() ? await walk(target) : [target];
  for (const file of files) {
    const text = await fs.readFile(file, 'utf8');
    for (const pattern of blocked) {
      if (pattern.test(text)) {
        failures.push(`${path.relative(repoRoot, file)} matches ${pattern}`);
      }
    }
  }
}

if (failures.length) {
  console.error('ScorePilot independence check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('ScorePilot independence check passed: no Base44 runtime dependency detected in src/package/Vite configuration.');
