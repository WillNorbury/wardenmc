import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const out = resolve(import.meta.dirname, "../public/version.json");
mkdirSync(dirname(out), { recursive: true });

writeFileSync(
  out,
  JSON.stringify({ version: Date.now().toString(36), builtAt: new Date().toISOString() }),
);

console.log("Wrote version.json");
