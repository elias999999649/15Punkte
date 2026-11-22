import fs from "node:fs";
import { execFileSync } from "node:child_process";

for (const file of [
  "src/components/App.tsx",
  "src/components/GradeEntryModal.tsx",
]) {
  const original = execFileSync("git", ["show", `HEAD:${file}`]).toString(
    "utf8",
  );
  fs.writeFileSync(file, original, "utf8");
}
