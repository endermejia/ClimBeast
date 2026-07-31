/**
 * check-global-data.mjs
 *
 * Verifies every public property of GlobalData is actually accessed
 * via `global.PROPERTY` somewhere in the project.
 *
 * Usage:
 *   node scripts/check-global-data.mjs
 *
 * Exit code 1 if any unused public properties are found.
 * Add to package.json: "check:global-data": "node scripts/check-global-data.mjs"
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const srcDir = resolve('src');
const globalDataPath = resolve('src/services/global-data.ts');

// Properties that are intentionally public but accessed via patterns
// other than `global.PROPERTY`. Add here only with a justifying comment.
const ALLOWLIST = new Set([
  'authState',       // accessed as global.authState.subProp in some components
  'topoData',        // accessed as global.topoData.subProp in some components
  'setTheme',        // bound method, called as global.setTheme(...)
  'resetDataByPage', // called as global.resetDataByPage(...)
]);

function findFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findFiles(fullPath));
    else if (
      (entry.name.endsWith('.ts') || entry.name.endsWith('.html')) &&
      !entry.name.endsWith('.d.ts')
    ) {
      results.push(fullPath);
    }
  }
  return results;
}

const globalDataContent = readFileSync(globalDataPath, 'utf-8');
const otherFiles = findFiles(srcDir).filter(
  (f) => f.replace(/\\/g, '/') !== globalDataPath.replace(/\\/g, '/'),
);
const allOtherContent = otherFiles.map((f) => readFileSync(f, 'utf-8')).join('\n');

// Parse public (non-private) class members from GlobalData
const classStart = globalDataContent.indexOf('export class GlobalData');
const classBody = globalDataContent.substring(classStart);
const memberRegex = /^  (?!private\s)(?:readonly\s+)?([a-zA-Z][a-zA-Z0-9_]*)\s*(?:[=:!<(])/gm;

const unused = [];
let match;
while ((match = memberRegex.exec(classBody)) !== null) {
  const name = match[1];
  if (ALLOWLIST.has(name)) continue;
  if (['constructor'].includes(name)) continue;

  const usedViaGlobal = new RegExp(`\\bglobal\\.${name}\\b`).test(allOtherContent);
  if (!usedViaGlobal) {
    const lineNum =
      globalDataContent.substring(0, classStart + match.index).split('\n').length +
      classBody.substring(0, match.index).split('\n').length -
      1;
    unused.push({ name, lineNum });
  }
}

if (unused.length === 0) {
  console.log('? GlobalData: all public properties are used externally.');
  process.exit(0);
} else {
  console.error(
    `\n? GlobalData has ${unused.length} public propert${unused.length === 1 ? 'y' : 'ies'} never accessed via \`global.PROPERTY\`:\n`,
  );
  for (const { name, lineNum } of unused) {
    console.error(`  src/services/global-data.ts:${lineNum}  ?  ${name}`);
  }
  console.error(
    '\nFix: remove the delegation, or add the name to ALLOWLIST with a comment explaining why.',
  );
  process.exit(1);
}
