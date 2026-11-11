import fs from "node:fs";
import path from "node:path";

const filePath = path.resolve(
  "node_modules/@angular/cli/src/utilities/node-version.js",
);

if (fs.existsSync(filePath)) {
  const content = fs.readFileSync(filePath, "utf8");
  if (content.includes("^24.15.0")) {
    fs.writeFileSync(filePath, content.replace("^24.15.0", "^24.3.0"), "utf8");
    console.log(
      "[patch-ng-node-version] Patched Angular CLI to support Bun (Node v24.3.0).",
    );
  }
}
