const fs = require("fs");
const content = fs.readFileSync(process.argv[2] || "lint-v2.txt", "utf-8");
const lines = content.split("\n");
let currentFile = "";

for (const line of lines) {
  const t = line.trim();
  if (/^[A-Z]:\\.*\.(tsx?|jsx?|mjs|cjs)\s*$/i.test(t)) {
    currentFile = t.replace(/^.*\\/, "");
    continue;
  }
  if (/^\s*\d+:\d+\s+error\s/.test(t)) {
    console.log(`${currentFile} :: ${t}`);
  }
}

