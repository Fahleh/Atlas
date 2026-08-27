import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "scripts"]);

// Matches Skeleton.tsx's own defaults. If those defaults ever change,
// update here too, this is not derived automatically from the component.
const DEFAULTS = {
  width: "100%",
  height: "1rem",
  borderRadius: "var(--radius-sm)",
};

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) walk(full, files);
    else if (extname(full) === ".tsx") files.push(full);
  }
  return files;
}

// Only matches plain string-literal JSX attributes (width="70%"), which is
// every current call site. A future call site using a template literal or
// expression would not be caught here and would need this extractor
// upgraded to a real JSX/AST parse.
function extractSkeletonTags(source) {
  const tags = [];
  const re = /<Skeleton\b([^>]*?)\/?>/gs;
  let m;
  while ((m = re.exec(source))) {
    const attrs = {};
    const attrRe = /(\w+)=\{?"([^"]*)"\}?/g;
    let am;
    while ((am = attrRe.exec(m[1]))) attrs[am[1]] = am[2];
    tags.push({
      width: attrs.width ?? DEFAULTS.width,
      height: attrs.height ?? DEFAULTS.height,
      borderRadius: attrs.borderRadius ?? DEFAULTS.borderRadius,
    });
  }
  return tags;
}

const combos = new Set();
for (const file of walk(ROOT)) {
  const source = readFileSync(file, "utf8");
  if (!source.includes("<Skeleton")) continue;
  for (const tag of extractSkeletonTags(source)) {
    combos.add(
      `--skeleton-width:${tag.width};--skeleton-height:${tag.height};--skeleton-radius:${tag.borderRadius}`,
    );
  }
}

export const SKELETON_STYLE_HASHES = [...combos].map(
  (s) => `'sha256-${createHash("sha256").update(s, "utf8").digest("base64")}'`,
);

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`${SKELETON_STYLE_HASHES.length} unique combinations found:`);
  console.log(SKELETON_STYLE_HASHES.join("\n"));
}
