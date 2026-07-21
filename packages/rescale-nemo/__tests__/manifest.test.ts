import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Guards the published manifests.
 *
 * @rescale/nemo@3.0.0 shipped with `"@zanreal/nemo": "workspace:^"` in its dependencies. The
 * workspace protocol is meant to be rewritten to a real range at publish time; under bun it was
 * not, so the literal specifier reached the registry and npm rejects it:
 *
 *     npm error code EUNSUPPORTEDPROTOCOL
 *     npm error Unsupported URL Type "workspace:": workspace:^
 *
 * That made the compatibility alias — the whole point of which is that existing installs keep
 * working — uninstallable. Nothing in the test suite or the release dry run covered it, because
 * both stop at `changeset version`; the defect only exists in the artifact.
 */

const root = join(import.meta.dir, "..", "..", "..");
const manifest = (path: string) =>
  JSON.parse(readFileSync(join(root, path, "package.json"), "utf8"));

/** Packages that actually get published, i.e. the ones whose manifests reach consumers. */
const PUBLISHABLE = ["packages/nemo", "packages/rescale-nemo", "packages/codemod"];

const DEPENDENCY_BLOCKS = [
  "dependencies",
  "peerDependencies",
  "optionalDependencies",
] as const;

describe("published manifests", () => {
  test.each(PUBLISHABLE)("%s declares no workspace: protocol", (path) => {
    const pkg = manifest(path);

    const offenders = DEPENDENCY_BLOCKS.flatMap((block) =>
      Object.entries(pkg[block] ?? {})
        .filter(([, range]) => String(range).startsWith("workspace:"))
        .map(([name, range]) => `${block}.${name} = ${range}`),
    );

    expect(offenders).toEqual([]);
  });

  // The two are a changesets `fixed` group, so a future major bumps both together. Without this
  // the alias would keep a stale `^3.0.0` while itself being published as 4.x — installable, but
  // resolving to the wrong library.
  test("the alias depends on the current major of the library", () => {
    const library = manifest("packages/nemo");
    const alias = manifest("packages/rescale-nemo");

    const range = alias.dependencies["@zanreal/nemo"];
    expect(range).toBeDefined();

    const majorOf = (value: string) => value.replace(/^[^0-9]*/, "").split(".")[0];

    expect(majorOf(range)).toBe(majorOf(library.version));
  });

  test("the alias points at the library by name", () => {
    const library = manifest("packages/nemo");
    const alias = manifest("packages/rescale-nemo");

    expect(Object.keys(alias.dependencies)).toEqual([library.name]);
  });
});
