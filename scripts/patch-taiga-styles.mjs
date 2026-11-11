import fs from "node:fs";
import path from "node:path";

const files = [
  "node_modules/@taiga-ui/kit/fesm2022/taiga-ui-kit-components-progress.mjs",
  "node_modules/@taiga-ui/kit/fesm2022/taiga-ui-kit-components-avatar.mjs",
  "node_modules/@taiga-ui/layout/fesm2022/taiga-ui-layout-components-card.mjs",
];

for (const rel of files) {
  const filePath = path.resolve(rel);
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, "utf8");

  // Convert `let Styles$N = class Styles {` to `class Styles$N {`
  content = content.replace(
    /let\s+(Styles\$\d+)\s*=\s*class\s+Styles\s*\{/g,
    "class $1 {",
  );

  // Ensure internal `type: Styles` matches the specific class name (`Styles$N` or `Styles`)
  const patched = content.replace(
    /(class\s+(Styles(?:\$\d+)?)\s*\{[\s\S]*?\n\};?\s*)(i0\.ɵɵngDeclareClassMetadata\(\{[\s\S]*?\}\);)/g,
    (match, classPart, className, metaPart) => {
      const fixedClass = classPart.replace(
        /type:\s*Styles(?:\$\d+)?\b/g,
        `type: ${className}`,
      );
      const fixedMeta = metaPart.replace(
        /type:\s*Styles(?:\$\d+)?\b/g,
        `type: ${className}`,
      );
      return fixedClass + fixedMeta;
    },
  );

  if (content !== patched) {
    fs.writeFileSync(filePath, patched, "utf8");
    console.log(`[patch-taiga-styles] Patched ${rel}`);
  }
}
