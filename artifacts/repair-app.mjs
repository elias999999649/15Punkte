import fs from "node:fs";

const path = "src/components/App.tsx";
const source = fs.readFileSync(path, "utf8");
const lines = source.split(/\r?\n/);
for (let index = 0; index < lines.length; index++) {
  if (/^(function |: \{)/.test(lines[index]))
    console.log(`${index + 1}: ${lines[index].slice(0, 130)}`);
}
