#!/usr/bin/env node
/**
 * security-check.js
 * Scans config files and source files for malware patterns before dev/build/commit.
 * Blocks execution if anything suspicious is found.
 *
 * Wired into:
 *   - npm run predev   (runs before `npm run dev`)
 *   - npm run prebuild (runs before `npm run build`)
 *   - .git/hooks/pre-commit
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname, basename, dirname } from 'path';
import { fileURLToPath } from 'url';

const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN  = '\x1b[32m';
const BOLD   = '\x1b[1m';
const RESET  = '\x1b[0m';

// ── Patterns that should never appear in source or config files ────────────────
const DANGER_PATTERNS = [
  { re: /eval\s*\(\s*atob\s*\(/,              label: 'eval(atob(...)) — base64 obfuscated execution' },
  { re: /eval\s*\(\s*Buffer\.from\s*\(/,      label: 'eval(Buffer.from(...)) — base64 obfuscated execution' },
  { re: /new\s+Function\s*\([^)]*atob\s*\(/,  label: 'new Function(atob(...)) — obfuscated execution' },
  { re: /global\s*\[\s*_\$_/,                 label: 'obfuscated global variable assignment' },
  { re: /global\s*\[[^\]]*\]\s*=\s*require/,  label: 'global require hijack' },
  { re: /global\s*\[[^\]]*\]\s*=\s*module/,   label: 'global module hijack' },
];

// ── Config files that must stay small (bytes) ─────────────────────────────────
const CONFIG_MAX_BYTES = {
  'postcss.config.js':  600,
  'postcss.config.ts':  600,
  'postcss.config.mjs': 600,
  'postcss.config.cjs': 600,
  'vite.config.js':     8_000,
  'vite.config.ts':     8_000,
  'vite.config.mjs':    8_000,
  'tailwind.config.js': 15_000,
  'tailwind.config.ts': 15_000,
  'eslint.config.js':   15_000,
  'eslint.config.mjs':  15_000,
};

// ── Lines longer than this in a config file are suspicious ────────────────────
const MAX_LINE_LENGTH = 500;

// ── File extensions to scan in src/ ──────────────────────────────────────────
const SOURCE_EXTS = new Set(['.js', '.ts', '.tsx', '.jsx', '.mjs', '.cjs']);

// ── Collect files ─────────────────────────────────────────────────────────────
function walk(dir, result = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return result; }
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) { walk(full, result); }
    else if (SOURCE_EXTS.has(extname(entry.name))) { result.push(full); }
  }
  return result;
}

const root = dirname(dirname(fileURLToPath(import.meta.url)));

// Config files in the root
const configFiles = readdirSync(root)
  .filter(f => /\.config\.(js|ts|mjs|cjs)$/.test(f))
  .map(f => join(root, f));

// Source files
const sourceFiles = walk(join(root, 'src'));

const allFiles = [...configFiles, ...sourceFiles];

// ── Scan ──────────────────────────────────────────────────────────────────────
const issues = [];

function flag(file, lineNum, msg) {
  issues.push({ file: file.replace(root, '').replace(/^[\\/]/, ''), lineNum, msg });
}

for (const file of allFiles) {
  const name = basename(file);
  let content;
  try { content = readFileSync(file, 'utf8'); } catch { continue; }

  // Size check for known-small config files
  if (CONFIG_MAX_BYTES[name] !== undefined) {
    const size = statSync(file).size;
    if (size > CONFIG_MAX_BYTES[name]) {
      flag(file, null,
        `${name} is ${size.toLocaleString()} bytes — expected < ${CONFIG_MAX_BYTES[name].toLocaleString()} bytes. ` +
        `Legitimate config files are tiny; this is a red flag.`
      );
    }
  }

  const lines = content.split('\n');
  const isConfig = configFiles.includes(file);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Suspiciously long lines in config files (malware hides after padding whitespace)
    if (isConfig && line.length > MAX_LINE_LENGTH) {
      flag(file, i + 1,
        `Line ${i + 1} is ${line.length.toLocaleString()} chars long — malware often hides payload ` +
        `after hundreds of spaces on a legitimate-looking line.`
      );
    }

    // Danger patterns in all files
    for (const { re, label } of DANGER_PATTERNS) {
      if (re.test(line)) {
        flag(file, i + 1, label);
      }
    }
  }
}

// ── Report ────────────────────────────────────────────────────────────────────
if (issues.length === 0) {
  console.log(`${GREEN}${BOLD}✓ Security check passed.${RESET} No malware patterns detected.`);
  process.exit(0);
}

console.error(`\n${RED}${BOLD}✗ SECURITY CHECK FAILED — ${issues.length} issue(s) detected:${RESET}\n`);
for (const { file, lineNum, msg } of issues) {
  const loc = lineNum ? `:${lineNum}` : '';
  console.error(`  ${YELLOW}${BOLD}${file}${loc}${RESET}`);
  console.error(`  ${msg}\n`);
}
console.error(
  `${RED}${BOLD}Dev server / build / commit blocked.${RESET} ` +
  `Investigate the flagged file(s) before proceeding.\n`
);
process.exit(1);
