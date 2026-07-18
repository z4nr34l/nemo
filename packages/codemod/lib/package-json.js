const OLD = "@rescale/nemo";
const NEW = "@zanreal/nemo";

const DEPENDENCY_FIELDS = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
];

/**
 * Renames the `@rescale/nemo` entry in every dependency block, keeping its position in the
 * object so the resulting diff stays readable.
 *
 * If the manifest already depends on `@zanreal/nemo`, the stale alias entry is dropped rather
 * than producing a duplicate dependency on the same code.
 *
 * @param {string} source raw package.json text
 * @param {string} range semver range to record for the renamed dependency
 * @returns {{ source: string, changes: string[] }}
 */
function migratePackageJson(source, range) {
  const manifest = JSON.parse(source);
  const changes = [];

  for (const field of DEPENDENCY_FIELDS) {
    const block = manifest[field];
    if (!block || typeof block !== "object" || !(OLD in block)) continue;

    const alreadyMigrated = NEW in block;
    const rebuilt = {};

    for (const [name, value] of Object.entries(block)) {
      if (name !== OLD) {
        rebuilt[name] = value;
        continue;
      }
      if (alreadyMigrated) {
        changes.push(`${field}: dropped ${OLD} (${NEW} already present)`);
        continue;
      }
      rebuilt[NEW] = range;
      changes.push(`${field}: ${OLD}@${value} -> ${NEW}@${range}`);
    }

    manifest[field] = rebuilt;
  }

  if (changes.length === 0) return { source, changes };

  // Match the file's own indentation and trailing newline so the diff is limited to the
  // dependency lines.
  const indentMatch = source.match(/\n(\s+)"/);
  const indent = indentMatch ? indentMatch[1] : "  ";
  const trailingNewline = source.endsWith("\n") ? "\n" : "";

  return { source: JSON.stringify(manifest, null, indent) + trailingNewline, changes };
}

module.exports = { migratePackageJson, DEPENDENCY_FIELDS, OLD, NEW };
