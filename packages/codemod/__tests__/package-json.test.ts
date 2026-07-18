import { describe, expect, it } from "bun:test";

const { migratePackageJson } = require("../lib/package-json.js");

const RANGE = "^3.0.0";

describe("migratePackageJson", () => {
  it("renames the dependency and records the new range", () => {
    const input = JSON.stringify({ dependencies: { "@rescale/nemo": "^2.1.0" } }, null, 2);
    const { source, changes } = migratePackageJson(input, RANGE);

    expect(JSON.parse(source).dependencies).toEqual({ "@zanreal/nemo": RANGE });
    expect(changes).toEqual(["dependencies: @rescale/nemo@^2.1.0 -> @zanreal/nemo@^3.0.0"]);
  });

  it("covers every dependency block", () => {
    const input = JSON.stringify(
      {
        dependencies: { "@rescale/nemo": "2.0.0" },
        devDependencies: { "@rescale/nemo": "2.0.0" },
        peerDependencies: { "@rescale/nemo": ">=2" },
        optionalDependencies: { "@rescale/nemo": "2.0.0" },
      },
      null,
      2,
    );
    const { source, changes } = migratePackageJson(input, RANGE);
    const manifest = JSON.parse(source);

    expect(changes).toHaveLength(4);
    for (const field of [
      "dependencies",
      "devDependencies",
      "peerDependencies",
      "optionalDependencies",
    ]) {
      expect(manifest[field]["@zanreal/nemo"]).toBe(RANGE);
      expect(manifest[field]["@rescale/nemo"]).toBeUndefined();
    }
  });

  it("keeps the dependency in its original position", () => {
    const input = JSON.stringify(
      { dependencies: { a: "1", "@rescale/nemo": "^2.0.0", z: "1" } },
      null,
      2,
    );
    const { source } = migratePackageJson(input, RANGE);
    expect(Object.keys(JSON.parse(source).dependencies)).toEqual(["a", "@zanreal/nemo", "z"]);
  });

  it("drops the alias when the new package is already present", () => {
    const input = JSON.stringify(
      { dependencies: { "@rescale/nemo": "^2.0.0", "@zanreal/nemo": "^3.0.0" } },
      null,
      2,
    );
    const { source, changes } = migratePackageJson(input, RANGE);

    expect(JSON.parse(source).dependencies).toEqual({ "@zanreal/nemo": "^3.0.0" });
    expect(changes[0]).toContain("dropped");
  });

  it("reports no changes for an unrelated manifest", () => {
    const input = JSON.stringify({ dependencies: { next: "^15.0.0" } }, null, 2);
    const { source, changes } = migratePackageJson(input, RANGE);

    expect(changes).toEqual([]);
    expect(source).toBe(input);
  });

  it("preserves indentation and the trailing newline", () => {
    const input = `{\n    "dependencies": {\n        "@rescale/nemo": "^2.0.0"\n    }\n}\n`;
    const { source } = migratePackageJson(input, RANGE);

    expect(source).toContain(`\n    "dependencies"`);
    expect(source.endsWith("\n")).toBe(true);
  });

  it("preserves CRLF line endings", () => {
    const input = `{\r\n  "dependencies": {\r\n    "@rescale/nemo": "^2.0.0"\r\n  }\r\n}\r\n`;
    const { source } = migratePackageJson(input, RANGE);

    expect(source).toContain("@zanreal/nemo");
    expect(source.includes("\r\n")).toBe(true);
    expect(/[^\r]\n/.test(source)).toBe(false);
  });

  // npm only treats a peer as optional when the meta key matches the dependency name, so a
  // stale key would quietly make the renamed peer required again.
  it("migrates the peerDependenciesMeta key alongside the peer", () => {
    const input = JSON.stringify(
      {
        peerDependencies: { "@rescale/nemo": ">=2" },
        peerDependenciesMeta: { "@rescale/nemo": { optional: true } },
      },
      null,
      2,
    );
    const { source, changes } = migratePackageJson(input, RANGE);
    const manifest = JSON.parse(source);

    expect(manifest.peerDependenciesMeta).toEqual({ "@zanreal/nemo": { optional: true } });
    expect(manifest.peerDependencies["@zanreal/nemo"]).toBe(RANGE);
    expect(changes.some((c: string) => c.includes("peerDependenciesMeta"))).toBe(true);
  });

  it("leaves an unrelated peerDependenciesMeta alone", () => {
    const input = JSON.stringify(
      { peerDependenciesMeta: { next: { optional: true } } },
      null,
      2,
    );
    const { source, changes } = migratePackageJson(input, RANGE);
    expect(changes).toEqual([]);
    expect(source).toBe(input);
  });
});
