const OLD = "@rescale/nemo";
const NEW = "@zanreal/nemo";

const DEPENDENCY_FIELDS = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
];

/**
 * peerDependenciesMeta is keyed by package name. Leaving it behind would mark the renamed
 * peer as required again, because npm only treats a peer as optional when the meta key
 * matches the dependency name.
 *
 * @param {Record<string, any>} manifest parsed manifest, rewritten in place
 * @param {string[]} changes running log, appended to
 */
function migratePeerDependenciesMeta(manifest, changes) {
  const meta = manifest.peerDependenciesMeta;
  if (!meta || typeof meta !== "object" || !(OLD in meta)) return;

  const rebuilt = {};
  for (const [name, value] of Object.entries(meta)) {
    if (name !== OLD) rebuilt[name] = value;
    else if (!(NEW in meta)) rebuilt[NEW] = value;
  }

  manifest.peerDependenciesMeta = rebuilt;
  changes.push(`peerDependenciesMeta: ${OLD} -> ${NEW}`);
}

/**
 * Renames the alias in one dependency block, keeping its position in the object so the resulting
 * diff stays readable.
 *
 * If the manifest already depends on `@zanreal/nemo`, the stale alias entry is dropped rather
 * than producing a duplicate dependency on the same code.
 *
 * @param {Record<string, any>} manifest parsed manifest, rewritten in place
 * @param {string} field dependency block to rewrite
 * @param {string} range semver range to record for the renamed dependency
 * @param {string[]} changes running log, appended to
 */
function migrateDependencyField(manifest, field, range, changes) {
  const block = manifest[field];
  if (!block || typeof block !== "object" || !(OLD in block)) return;

  const alreadyMigrated = NEW in block;
  const rebuilt = {};

  for (const [name, value] of Object.entries(block)) {
    if (name !== OLD) {
      rebuilt[name] = value;
    } else if (alreadyMigrated) {
      changes.push(`${field}: dropped ${OLD} (${NEW} already present)`);
    } else {
      rebuilt[NEW] = range;
      changes.push(`${field}: ${OLD}@${value} -> ${NEW}@${range}`);
    }
  }

  manifest[field] = rebuilt;
}

/**
 * Reads the manifest's own indentation and line endings back off the source, so the rewrite is
 * limited to the dependency lines rather than reformatting the whole file.
 *
 * @param {string} source raw package.json text
 * @returns {{ indent: string, crlf: boolean, trailingNewline: string }}
 */
function detectFormatting(source) {
  const indentMatch = /\r?\n([ \t]+)"/.exec(source);
  const crlf = source.includes("\r\n");

  let trailingNewline = "";
  if (/\r?\n$/.test(source)) trailingNewline = crlf ? "\r\n" : "\n";

  return { indent: indentMatch ? indentMatch[1] : "  ", crlf, trailingNewline };
}

/**
 * Renames the `@rescale/nemo` entry in every dependency block.
 *
 * @param {string} source raw package.json text
 * @param {string} range semver range to record for the renamed dependency
 * @returns {{ source: string, changes: string[] }}
 */
function migratePackageJson(source, range) {
  const manifest = JSON.parse(source);
  const changes = [];

  migratePeerDependenciesMeta(manifest, changes);

  for (const field of DEPENDENCY_FIELDS) {
    migrateDependencyField(manifest, field, range, changes);
  }

  if (changes.length === 0) return { source, changes };

  const { indent, crlf, trailingNewline } = detectFormatting(source);
  let out = JSON.stringify(manifest, null, indent);
  if (crlf) out = out.replaceAll("\n", "\r\n");

  return { source: out + trailingNewline, changes };
}

module.exports = { migratePackageJson, DEPENDENCY_FIELDS, OLD, NEW };
