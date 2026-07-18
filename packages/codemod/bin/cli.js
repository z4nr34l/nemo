#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { run: jscodeshift } = require("jscodeshift/src/Runner");
const { migratePackageJson } = require("../lib/package-json");

const TRANSFORM = path.join(__dirname, "..", "transforms", "rescale-to-zanreal.js");
const DEFAULT_EXTENSIONS = "js,jsx,ts,tsx,mjs,cjs,mts,cts";
const DEFAULT_RANGE = "^3.0.0";
const SKIP_DIRS = new Set(["node_modules", ".git", ".next", ".turbo", "dist", "build", "out",
  "coverage", ".vercel", ".cache"]);

const HELP = `
  Migrate a project from @rescale/nemo to @zanreal/nemo.

  Usage
    $ npx @zanreal/nemo-codemod [paths...]

  Options
    --dry              Preview the changes without writing them
    --print            Print the transformed source of every changed file
    --dep-range <r>    Semver range written for the renamed dependency (default: ${DEFAULT_RANGE})
    --extensions <e>   Comma separated file extensions (default: ${DEFAULT_EXTENSIONS})
    --ignore-pattern   Glob of files to skip; repeatable
    --skip-manifests   Leave package.json files alone
    -h, --help         Show this message

  Examples
    $ npx @zanreal/nemo-codemod              # migrate the current directory
    $ npx @zanreal/nemo-codemod src --dry    # preview changes under src/
`;

function parseArgs(argv) {
  const options = {
    paths: [],
    dry: false,
    print: false,
    depRange: DEFAULT_RANGE,
    extensions: DEFAULT_EXTENSIONS,
    ignorePattern: [],
    skipManifests: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "-h":
      case "--help":
        options.help = true;
        break;
      case "--dry":
        options.dry = true;
        break;
      case "--print":
        options.print = true;
        break;
      case "--skip-manifests":
        options.skipManifests = true;
        break;
      case "--dep-range":
        options.depRange = argv[++i];
        break;
      case "--extensions":
        options.extensions = argv[++i];
        break;
      case "--ignore-pattern":
        options.ignorePattern.push(argv[++i]);
        break;
      default:
        if (arg.startsWith("-")) throw new Error(`Unknown option: ${arg}`);
        options.paths.push(arg);
    }
  }

  if (options.paths.length === 0) options.paths.push(".");
  return options;
}

/** Every package.json under `root`, ignoring build output and dependency directories. */
function findManifests(root, found = []) {
  let entries;
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return found;
  }

  for (const entry of entries) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) findManifests(full, found);
    } else if (entry.name === "package.json") {
      found.push(full);
    }
  }
  return found;
}

function migrateManifests(paths, { depRange, dry }) {
  const targets = new Set();
  for (const target of paths) {
    const stat = fs.statSync(target);
    if (stat.isDirectory()) findManifests(target).forEach((f) => targets.add(f));
    else if (path.basename(target) === "package.json") targets.add(target);
  }

  const touched = [];
  for (const manifest of targets) {
    const original = fs.readFileSync(manifest, "utf8");
    let result;
    try {
      result = migratePackageJson(original, depRange);
    } catch {
      console.warn(`  ! skipped unparseable manifest: ${manifest}`);
      continue;
    }
    if (result.changes.length === 0) continue;
    if (!dry) fs.writeFileSync(manifest, result.source);
    touched.push({ manifest, changes: result.changes });
  }
  return touched;
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }

  if (options.help) {
    console.log(HELP);
    return;
  }

  for (const target of options.paths) {
    if (!fs.existsSync(target)) {
      console.error(`Path does not exist: ${target}`);
      process.exit(1);
    }
  }

  if (options.dry) console.log("Dry run — nothing will be written.\n");

  console.log("Rewriting imports…");
  const stats = await jscodeshift(TRANSFORM, options.paths, {
    dry: options.dry,
    print: options.print,
    extensions: options.extensions,
    ignorePattern: ["**/node_modules/**", ...options.ignorePattern],
    parser: "tsx",
    babel: true,
    silent: true,
    verbose: 0,
  });

  console.log(`  ${stats.ok} file(s) updated, ${stats.nochange} unchanged, ${stats.error} error(s)`);

  let manifests = [];
  if (!options.skipManifests) {
    console.log("\nUpdating package.json files…");
    manifests = migrateManifests(options.paths, options);
    if (manifests.length === 0) {
      console.log("  no @rescale/nemo dependency found");
    } else {
      for (const { manifest, changes } of manifests) {
        console.log(`  ${manifest}`);
        for (const change of changes) console.log(`    ${change}`);
      }
    }
  }

  if (stats.ok === 0 && manifests.length === 0) {
    console.log("\nNothing to migrate — this project does not reference @rescale/nemo.");
    return;
  }

  if (options.dry) {
    console.log("\nDry run complete. Re-run without --dry to apply.");
    return;
  }

  console.log("\nDone. Next steps:");
  console.log("  1. Reinstall dependencies so the lockfile picks up @zanreal/nemo");
  console.log("  2. Review the diff and run your test suite");

  if (stats.error > 0) process.exit(1);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { main, parseArgs, findManifests, migrateManifests, DEFAULT_RANGE, HELP };
