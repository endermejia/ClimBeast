import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";

const base = "./public/i18n";

const files = readdirSync(base).filter((file) => file.endsWith(".json"));

// Read reference files (en.json and es.json)
const enData = JSON.parse(readFileSync(join(base, "en.json"), "utf-8"));
const esData = JSON.parse(readFileSync(join(base, "es.json"), "utf-8"));

// Collect all unique keys
const allKeys = new Set([...Object.keys(enData), ...Object.keys(esData)]);

for (const file of files) {
  const path = join(base, file);
  const data = JSON.parse(readFileSync(path, "utf-8"));

  for (const key of Object.keys(data)) {
    allKeys.add(key);
  }
}

const sortedKeys = Array.from(allKeys).sort((a, b) => a.localeCompare(b));

for (const file of files) {
  const path = join(base, file);
  const data = JSON.parse(readFileSync(path, "utf-8"));
  const synced = {};

  for (const key of sortedKeys) {
    if (data[key] !== undefined) {
      synced[key] = data[key];
    } else {
      synced[key] = enData[key] ?? esData[key] ?? "";
    }
  }

  writeFileSync(path, JSON.stringify(synced, null, 2) + "\n");
  console.log(`Synced and sorted ${file}`);
}
