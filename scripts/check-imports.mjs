#!/usr/bin/env node

// check-imports.mjs
//
// Validates import ordering in all .ts files under src/.
//
// Groups (in order):
//   1. @angular/*
//   2. @taiga-ui/*
//   3. Third-party (@ngx-translate, @supabase, rxjs, etc.)
//   4. Local services (../../services/*)
//   5. Local components (../../components/*)
//   6. Local models (../../models)
//   7. Local pipes, utils, constants (../../pipes, ../../utils, ../../constants)
//
// Rules:
//   - Groups must appear in the correct order
//   - Groups must be separated by at least one blank line
//   - Imports within each group must be alphabetically sorted by path
//
// Usage:
//   node scripts/check-imports.mjs [--fix] [file...]
//
//   --fix    Auto-fix ordering (rewrites files)
//   file...  Check specific files (default: all src/**/*.ts)

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SRC_DIR = resolve(__dirname, '../src');

// ── Group classification ──────────────────────────────────────────────────────

const GROUP_PATTERNS = [
  { name: 'angular', test: (p) => p.startsWith('@angular/') },
  { name: 'taiga', test: (p) => p.startsWith('@taiga-ui/') },
  {
    name: 'third-party',
    test: (p) =>
      !p.startsWith('@angular/') &&
      !p.startsWith('@taiga-ui/') &&
      !p.startsWith('.') &&
      !p.startsWith('src/'),
  },
  { name: 'services', test: (p) => /(?:^|\/)services\//.test(p) },
  { name: 'components', test: (p) => /(?:^|\/)components\//.test(p) },
  { name: 'models', test: (p) => /(?:^|\/)models(?:\/|$)/.test(p) },
  {
    name: 'pipes-utils',
    test: (p) =>
      /(?:^|\/)(?:pipes|utils|constants)(?:\/|$)/.test(p),
  },
];

const GROUP_ORDER = GROUP_PATTERNS.map((g) => g.name);

function classifyImport(modulePath) {
  for (const g of GROUP_PATTERNS) {
    if (g.test(modulePath)) return g.name;
  }
  return 'other'; // should not happen for well-structured code
}

// ── Parse imports ─────────────────────────────────────────────────────────────

/**
 * Returns array of { line, lineNum, modulePath, group }
 * for each import statement (handles multi-line imports).
 */
function parseImports(lines) {
  const imports = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Detect start of import statement
    if (!trimmed.startsWith('import ')) {
      i++;
      continue;
    }

    // Skip `import type` used as a type-only re-export or value import
    // Collect full import statement (may span multiple lines)
    let fullImport = trimmed;
    const startLine = i;
    while (!fullImport.includes(';') && i < lines.length - 1) {
      i++;
      fullImport += ' ' + lines[i].trim();
    }

    // Extract module path
    const match = fullImport.match(/from\s+['"]([^'"]+)['"]/);
    if (!match) {
      // side-effect import like `import 'zone.js'`
      i++;
      continue;
    }

    const modulePath = match[1];
    const group = classifyImport(modulePath);

    imports.push({
      line: fullImport,
      lineNum: startLine + 1, // 1-indexed
      modulePath,
      group,
    });

    i++;
  }

  return imports;
}

// ── Validate ──────────────────────────────────────────────────────────────────

function validateFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  const imports = parseImports(lines);
  if (imports.length === 0) return [];

  const errors = [];

  // Check group ordering
  let lastGroupIndex = -1;
  for (const imp of imports) {
    const groupIndex = GROUP_ORDER.indexOf(imp.group);
    if (groupIndex === -1) continue; // unknown group, skip

    if (groupIndex < lastGroupIndex) {
      const expectedGroup = GROUP_ORDER[lastGroupIndex];
      errors.push({
        line: imp.lineNum,
        message: `Import '${imp.modulePath}' is in group '${imp.group}' but should appear before group '${expectedGroup}'`,
      });
    }
    lastGroupIndex = groupIndex;
  }

  // Check blank line separation between groups
  for (let i = 1; i < imports.length; i++) {
    const prev = imports[i - 1];
    const curr = imports[i];

    if (prev.group !== curr.group) {
      // There should be a blank line between these imports
      const prevLineNum = prev.lineNum; // 1-indexed
      const currLineNum = curr.lineNum; // 1-indexed

      // Check if there's a blank line between prev.endLine and curr.startLine
      // We need to find the actual end line of the previous import
      let prevEndLine = prevLineNum - 1; // 0-indexed
      let fullPrev = lines[prevEndLine].trim();
      while (!fullPrev.includes(';') && prevEndLine < lines.length - 1) {
        prevEndLine++;
        fullPrev += ' ' + lines[prevEndLine].trim();
      }

      // Check lines between prevEndLine and curr.lineNum (0-indexed)
      let hasBlankLine = false;
      for (let j = prevEndLine + 1; j < curr.lineNum - 1; j++) {
        if (lines[j].trim() === '') {
          hasBlankLine = true;
          break;
        }
      }

      if (!hasBlankLine) {
        errors.push({
          line: curr.lineNum,
          message: `Missing blank line between '${prev.group}' and '${curr.group}' groups (before '${curr.modulePath}')`,
        });
      }
    }
  }

  // Check alphabetical sorting within each group
  const groups = new Map();
  for (const imp of imports) {
    if (!groups.has(imp.group)) groups.set(imp.group, []);
    groups.get(imp.group).push(imp);
  }

  for (const [groupName, groupImports] of groups) {
    for (let i = 1; i < groupImports.length; i++) {
      const prev = groupImports[i - 1];
      const curr = groupImports[i];

      if (curr.modulePath < prev.modulePath) {
        errors.push({
          line: curr.lineNum,
          message: `Import '${curr.modulePath}' should come before '${prev.modulePath}' in group '${groupName}' (not alphabetically sorted)`,
        });
      }
    }
  }

  return errors;
}

// ── Auto-fix ──────────────────────────────────────────────────────────────────

function fixFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  const imports = parseImports(lines);
  if (imports.length === 0) return false;

  // Build a set of line numbers that are part of imports
  const importLineSet = new Set();
  const importByLine = new Map();
  for (const imp of imports) {
    let startLine = imp.lineNum - 1;
    let endLine = startLine;
    let full = lines[endLine].trim();
    while (!full.includes(';') && endLine < lines.length - 1) {
      endLine++;
      full += ' ' + lines[endLine].trim();
    }
    for (let j = startLine; j <= endLine; j++) {
      importLineSet.add(j);
      importByLine.set(j, imp);
    }
  }

  // Find runs of consecutive import lines
  const runs = [];
  let currentRun = null;
  for (let i = 0; i < lines.length; i++) {
    if (importLineSet.has(i)) {
      if (!currentRun) {
        currentRun = { start: i, end: i, imports: [] };
      }
      currentRun.end = i;
      const imp = importByLine.get(i);
      if (
        currentRun.imports.length === 0 ||
        currentRun.imports[currentRun.imports.length - 1] !== imp
      ) {
        currentRun.imports.push(imp);
      }
    } else {
      if (currentRun) {
        runs.push(currentRun);
        currentRun = null;
      }
    }
  }
  if (currentRun) runs.push(currentRun);

  // Global sort: collect ALL imports, sort by group then alphabetically
  const allImportsSorted = [];
  for (const groupName of [...GROUP_ORDER, 'other']) {
    const groupImports = imports
      .filter((imp) => imp.group === groupName)
      .sort((a, b) => a.modulePath.localeCompare(b.modulePath));
    allImportsSorted.push(...groupImports);
  }

  // Build a lookup: for each run start, the run object
  const runByStart = new Map();
  for (const run of runs) {
    runByStart.set(run.start, run);
  }

  // Single-pass rebuild: walk lines, when hitting a run start, output sorted version and skip
  const result = [];
  let modified = false;
  let i = 0;
  let sortedIdx = 0; // index into allImportsSorted

  while (i < lines.length) {
    const run = runByStart.get(i);
    if (run) {
      // Count how many imports are in this run
      const runImportCount = run.imports.length;

      // Output the next runImportCount imports from the global sorted list
      const sortedLines = [];
      let firstGroup = true;
      let prevGroup = null;
      for (let k = 0; k < runImportCount; k++) {
        const imp = allImportsSorted[sortedIdx + k];
        if (!imp) break;

        if (prevGroup !== null && imp.group !== prevGroup) {
          sortedLines.push(''); // blank line between groups
        }
        prevGroup = imp.group;
        firstGroup = false;

        let startLine = imp.lineNum - 1;
        let endLine = startLine;
        let full = lines[startLine].trim();
        while (!full.includes(';') && endLine < lines.length - 1) {
          endLine++;
          full += ' ' + lines[endLine].trim();
        }
        sortedLines.push(full);
      }

      result.push(...sortedLines);
      sortedIdx += runImportCount;
      modified = true;
      i = run.end + 1;
    } else {
      result.push(lines[i]);
      i++;
    }
  }

  if (modified) {
    const newContent = result.join('\n');
    if (newContent !== content) {
      writeFileSync(filePath, newContent, 'utf-8');
      return true;
    }
  }
  return false;
}

// ── Main ──────────────────────────────────────────────────────────────────────

function findTsFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findTsFiles(fullPath));
    } else if (
      entry.name.endsWith('.ts') &&
      !entry.name.endsWith('.d.ts')
    ) {
      results.push(fullPath);
    }
  }
  return results;
}

async function main() {
  const args = process.argv.slice(2);
  const fixMode = args.includes('--fix');
  const filesArg = args.filter((a) => !a.startsWith('--'));

  let files;
  if (filesArg.length > 0) {
    files = filesArg.map((f) => resolve(f));
  } else {
    files = findTsFiles(SRC_DIR);
  }

  let totalErrors = 0;
  let fixedFiles = 0;

  for (const file of files) {
    if (fixMode) {
      const fixed = fixFile(file);
      if (fixed) fixedFiles++;
    }

    const errors = validateFile(file);
    if (errors.length > 0) {
      const relPath = relative(SRC_DIR, file);
      for (const err of errors) {
        console.error(`${relPath}:${err.line}  ${err.message}`);
      }
      totalErrors += errors.length;
    }
  }

  if (fixMode && fixedFiles > 0) {
    console.log(`\nFixed ${fixedFiles} file(s).`);
  }

  if (totalErrors > 0) {
    console.error(`\n${totalErrors} import ordering error(s) found.`);
    process.exit(1);
  } else {
    console.log('All imports correctly ordered.');
  }
}

main();
