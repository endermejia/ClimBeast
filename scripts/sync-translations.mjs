import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const base = './public/i18n';

const files = readdirSync(base).filter((file) => file.endsWith('.json'));

for (const file of files) {
  const path = join(base, file);
  const data = JSON.parse(readFileSync(path, 'utf-8'));
  const sorted = Object.fromEntries(
    Object.entries(data).sort(([a], [b]) => a.localeCompare(b)),
  );
  writeFileSync(path, JSON.stringify(sorted, null, 2) + '\n');
  console.log(`Sorted ${file}`);
}

