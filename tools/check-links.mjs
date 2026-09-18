// Verifies that every internal link, asset reference and anchor target in the
// generated site actually resolves.
//
//   node tools/check-links.mjs
//
// Exits non-zero on any broken link.

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = join(ROOT, "site");

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}

/** Map of absolute html file path -> set of ids it defines. */
function collectIds(files) {
  const map = new Map();
  for (const f of files) {
    const ids = new Set(
      [...readFileSync(f, "utf8").matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]),
    );
    map.set(f, ids);
  }
  return map;
}

const files = walk(SITE);
const ids = collectIds(files);

const broken = [];
const pending = [];
let checked = 0;

for (const file of files) {
  const html = readFileSync(file, "utf8");
  const refs = [
    ...html.matchAll(/\s(?:href|src)="([^"]+)"/g),
    // inline onerror handlers reference nothing; skip them
  ].map((m) => m[1]);

  for (const raw of refs) {
    if (/^(https?:|mailto:|data:|#)/.test(raw)) {
      // pure in-page anchor
      if (raw.startsWith("#") && raw.length > 1) {
        checked++;
        if (!ids.get(file)?.has(raw.slice(1))) {
          broken.push(`${relative(SITE, file)} -> ${raw} (missing anchor on same page)`);
        }
      }
      continue;
    }

    checked++;
    const [pathPart, hash] = raw.split("#");
    const target = resolve(dirname(file), decodeURIComponent(pathPart));

    let realFile = target;
    if (pathPart.endsWith("/") || (existsSync(target) && statSync(target).isDirectory())) {
      realFile = join(target, "index.html");
    }

    if (!existsSync(realFile)) {
      broken.push(`${relative(SITE, file).split(sep).join("/")} -> ${raw} (no such file)`);
      continue;
    }

    if (hash && realFile.endsWith(".html")) {
      if (!ids.get(realFile)?.has(hash)) {
        broken.push(`${relative(SITE, file).split(sep).join("/")} -> ${raw} (missing anchor)`);
      }
    }
  }
}

console.log(`Checked ${checked} references across ${files.length} generated pages.`);

if (pending.length) {
  console.log(`\n${pending.length} pending screenshot asset(s) (expected until captured):`);
  for (const p of [...new Set(pending)].sort()) console.log(`  · ${p}`);
}

if (broken.length) {
  console.error(`\n${broken.length} BROKEN reference(s):`);
  for (const b of broken) console.error(`  ✗ ${b}`);
  process.exit(1);
}

console.log("\nAll internal links and anchors resolve.");
