#!/usr/bin/env node
/**
 * CI guard: block any new caller of `deleteFromR2` that isn't on the allow-list.
 *
 * `deleteFromR2` is powerful — it removes objects from R2 without touching the
 * database or writing an audit row. The sanctioned way to delete a private
 * object is `auditedDeletePrivate` from `@/lib/private-file-audit`, which logs
 * a `PrivateFileDeletion` row first. Public deletes (profile avatars, product
 * images) may call `deleteFromR2` directly but only from a small set of files.
 *
 * If this script exits non-zero, either:
 *   a) wire the new caller through `auditedDeletePrivate`, or
 *   b) if public, add the file to ALLOWED_CALLERS with a one-line justification.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const here     = fileURLToPath(new URL('.', import.meta.url))
const root     = join(here, '..')
const srcDir   = join(root, 'src')
const scriptsDir = join(root, 'scripts')

// Allow-list: files permitted to import/call `deleteFromR2` directly.
// Keep this list small. New entries require reviewer sign-off.
//
// Path format: POSIX-style relative-to-repo-root paths.
const ALLOWED_CALLERS = new Set([
  'src/lib/r2.ts',                           // definition
  'src/lib/private-file-audit.ts',           // audited wrapper — the sanctioned path
  'scripts/check-r2-delete-guard.mjs',       // this file (self-reference in docs)
  // Public-object deletes (no audit required — no PII).
  // Add new public-delete files here with justification.
  'scripts/seed-kyc-disputes.ts',            // seed cleanup (test data only)
])

const IGNORED_DIRS = new Set([
  'node_modules', '.next', '.turbo', '.git', 'src/generated', 'dist', 'build',
  '.vercel', 'playwright-report', 'test-results', '.claude', 'src/graphify-out',
  'public',
])

const EXTS = new Set(['.ts', '.tsx', '.mjs', '.js', '.cjs'])

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const rel = relative(root, full).split(sep).join('/')
    if (IGNORED_DIRS.has(entry) || IGNORED_DIRS.has(rel)) continue
    const s = statSync(full)
    if (s.isDirectory()) {
      yield* walk(full)
    } else {
      const ext = full.slice(full.lastIndexOf('.'))
      if (EXTS.has(ext)) yield full
    }
  }
}

const offenders = []
for (const dir of [srcDir, scriptsDir]) {
  for (const f of walk(dir)) {
    const rel = relative(root, f).split(sep).join('/')
    if (ALLOWED_CALLERS.has(rel)) continue
    const txt = readFileSync(f, 'utf8')
    if (txt.includes('deleteFromR2')) {
      offenders.push(rel)
    }
  }
}

if (offenders.length) {
  console.error('\n✗ deleteFromR2 guard: unapproved caller(s) found.\n')
  console.error('Use `auditedDeletePrivate` from src/lib/private-file-audit for')
  console.error('private-prefix deletions. Public deletes may call deleteFromR2')
  console.error('directly — add the file to ALLOWED_CALLERS in this script.\n')
  for (const o of offenders) console.error(`  - ${o}`)
  console.error('')
  process.exit(1)
}

console.log(`✓ deleteFromR2 guard: ${ALLOWED_CALLERS.size} approved caller(s), 0 offenders.`)
