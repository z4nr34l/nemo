import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const { parseArgs, findManifests, migrateManifests, main, runCli, DEFAULT_RANGE } =
  require("../bin/cli.js");

const CLI = path.join(import.meta.dir, "..", "bin", "cli.js");

let fixture: string;

function write(relative: string, contents: string) {
  const full = path.join(fixture, relative);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, contents);
  return full;
}

const read = (relative: string) => fs.readFileSync(path.join(fixture, relative), "utf8");

beforeEach(() => {
  fixture = fs.mkdtempSync(path.join(os.tmpdir(), "nemo-codemod-"));
});

afterEach(() => {
  fs.rmSync(fixture, { recursive: true, force: true });
});

describe("parseArgs", () => {
  it("defaults to the current directory", () => {
    expect(parseArgs([]).paths).toEqual(["."]);
    expect(parseArgs([]).depRange).toBe(DEFAULT_RANGE);
  });

  it("reads flags and paths", () => {
    const options = parseArgs(["src", "app", "--dry", "--dep-range", "^4.0.0"]);
    expect(options.paths).toEqual(["src", "app"]);
    expect(options.dry).toBe(true);
    expect(options.depRange).toBe("^4.0.0");
  });

  it("collects repeated ignore patterns", () => {
    const options = parseArgs(["--ignore-pattern", "a/**", "--ignore-pattern", "b/**"]);
    expect(options.ignorePattern).toEqual(["a/**", "b/**"]);
  });

  it("rejects unknown options", () => {
    expect(() => parseArgs(["--nope"])).toThrow("Unknown option: --nope");
  });

  it("reads the remaining flags", () => {
    const options = parseArgs(["--print", "--skip-manifests", "--extensions", "ts,tsx"]);
    expect(options.print).toBe(true);
    expect(options.skipManifests).toBe(true);
    expect(options.extensions).toBe("ts,tsx");
  });

  it("recognises both help flags", () => {
    expect(parseArgs(["-h"]).help).toBe(true);
    expect(parseArgs(["--help"]).help).toBe(true);
  });

  // A missing value used to become `undefined`, reach migratePackageJson, and get dropped by
  // JSON.stringify — deleting the dependency instead of renaming it.
  it("rejects a value-taking flag with no value", () => {
    expect(() => parseArgs(["--dep-range"])).toThrow("--dep-range requires a value");
    expect(() => parseArgs(["--extensions"])).toThrow("--extensions requires a value");
    expect(() => parseArgs(["--ignore-pattern"])).toThrow("--ignore-pattern requires a value");
  });

  it("rejects a value-taking flag followed by another flag", () => {
    expect(() => parseArgs(["--dep-range", "--dry"])).toThrow("--dep-range requires a value");
  });
});

describe("findManifests", () => {
  it("finds nested manifests and skips dependency and build directories", () => {
    write("package.json", "{}");
    write("packages/app/package.json", "{}");
    write("node_modules/pkg/package.json", "{}");
    write("dist/package.json", "{}");

    const found = findManifests(fixture).map((f: string) => path.relative(fixture, f)).sort();
    expect(found).toEqual(["package.json", path.join("packages", "app", "package.json")]);
  });

  // A directory that cannot be read is not a reason to abort the whole migration, so the walk
  // swallows the error and keeps whatever it has found so far.
  it("returns what it already found when a directory cannot be read", () => {
    write("package.json", "{}");
    const found = ["seed.json"];

    expect(findManifests(path.join(fixture, "not-here"))).toEqual([]);
    expect(findManifests(path.join(fixture, "not-here"), found)).toBe(found);
    expect(found).toEqual(["seed.json"]);
  });
});

describe("migrateManifests", () => {
  it("rewrites manifests in place", () => {
    write("package.json", JSON.stringify({ dependencies: { "@rescale/nemo": "^2.0.0" } }, null, 2));

    const touched = migrateManifests([fixture], { depRange: "^3.0.0", dry: false });

    expect(touched).toHaveLength(1);
    expect(JSON.parse(read("package.json")).dependencies).toEqual({ "@zanreal/nemo": "^3.0.0" });
  });

  it("writes nothing on a dry run", () => {
    const original = JSON.stringify({ dependencies: { "@rescale/nemo": "^2.0.0" } }, null, 2);
    write("package.json", original);

    const touched = migrateManifests([fixture], { depRange: "^3.0.0", dry: true });

    expect(touched).toHaveLength(1);
    expect(read("package.json")).toBe(original);
  });

  it("ignores manifests without the dependency", () => {
    write("package.json", JSON.stringify({ dependencies: { next: "^15.0.0" } }, null, 2));
    expect(migrateManifests([fixture], { depRange: "^3.0.0", dry: false })).toEqual([]);
  });

  it("accepts a direct path to a manifest", () => {
    const manifest = write(
      "package.json",
      JSON.stringify({ dependencies: { "@rescale/nemo": "^2.0.0" } }, null, 2),
    );
    expect(migrateManifests([manifest], { depRange: "^3.0.0", dry: false })).toHaveLength(1);
  });

  it("honours --ignore-pattern when discovering manifests", () => {
    write("package.json", JSON.stringify({ dependencies: { "@rescale/nemo": "^2.0.0" } }, null, 2));
    write(
      "fixtures/app/package.json",
      JSON.stringify({ dependencies: { "@rescale/nemo": "^2.0.0" } }, null, 2),
    );

    const touched = migrateManifests([fixture], {
      depRange: "^3.0.0",
      dry: false,
      ignorePattern: ["**/fixtures/**"],
    });

    expect(touched).toHaveLength(1);
    expect(read("fixtures/app/package.json")).toContain("@rescale/nemo");
    expect(read("package.json")).toContain("@zanreal/nemo");
  });

  // The glob compiler is internal, so its branches are exercised through the flag that feeds
  // it. One pattern per shape: `**/` spanning segments, `?` for a single character, `*` staying
  // inside one segment, and the literal dot in `package.json` that has to be escaped before it
  // reaches the RegExp - unescaped it would match any character and widen the pattern.
  it("honours ?, single-star and literal-dot ignore patterns", () => {
    const dependency = JSON.stringify({ dependencies: { "@rescale/nemo": "^2.0.0" } }, null, 2);
    write("apps/web1/package.json", dependency);
    write("vendor-acme/package.json", dependency);
    write("keep/package.json", dependency);

    const touched = migrateManifests([fixture], {
      depRange: "^3.0.0",
      dry: false,
      ignorePattern: ["**/web?/package.json", "**/vendor-*/*.json"],
    });

    expect(touched).toHaveLength(1);
    expect(read("apps/web1/package.json")).toContain("@rescale/nemo");
    expect(read("vendor-acme/package.json")).toContain("@rescale/nemo");
    expect(read("keep/package.json")).toContain("@zanreal/nemo");
  });

  it("warns and continues past an unparseable manifest", () => {
    write("package.json", "{ this is not json");
    const original = console.warn;
    const warnings: string[] = [];
    console.warn = (message: string) => warnings.push(message);
    try {
      expect(migrateManifests([fixture], { depRange: "^3.0.0", dry: false })).toEqual([]);
    } finally {
      console.warn = original;
    }
    expect(warnings.join("\n")).toContain("unparseable manifest");
  });
});

describe("end to end", () => {
  /** Runs `invoke` under the given argv, capturing stdout instead of printing it. */
  async function withArgv(args: string[], invoke: () => Promise<void>): Promise<string> {
    const argv = process.argv;
    const log = console.log;
    const output: string[] = [];
    process.argv = ["node", "cli.js", ...args];
    console.log = (...parts: unknown[]) => output.push(parts.join(" "));
    try {
      await invoke();
    } finally {
      console.log = log;
      process.argv = argv;
    }
    return output.join("\n");
  }

  const runMain = (args: string[]) => withArgv(args, main);

  /**
   * Replaces process.exit with a throw, so a call that would kill the test runner stops the
   * function under test instead, and collects what it printed on the way out.
   */
  function stubExit() {
    const exit = process.exit;
    const errorLog = console.error;
    const codes: number[] = [];
    const errors: string[] = [];
    // @ts-expect-error -- stubbed for the assertion, throws to stop main() early
    process.exit = (code: number) => {
      codes.push(code);
      throw new Error("exited");
    };
    console.error = (...parts: unknown[]) => errors.push(parts.map(String).join(" "));
    return {
      codes,
      errors,
      restore() {
        process.exit = exit;
        console.error = errorLog;
      },
    };
  }

  it("migrates sources and the manifest in one run", async () => {
    write(
      "package.json",
      JSON.stringify({ name: "app", dependencies: { "@rescale/nemo": "^2.1.0" } }, null, 2),
    );
    write(
      "proxy.ts",
      `import { createNEMO } from "@rescale/nemo";\n\nexport const proxy = createNEMO({});\n`,
    );
    write(
      "lib/storage.ts",
      `import { MemoryStorageAdapter } from "@rescale/nemo/storage";\nexport default MemoryStorageAdapter;\n`,
    );
    write("untouched.ts", `export const note = "@rescale/nemo lives here as text";\n`);

    await runMain([fixture]);

    expect(read("proxy.ts")).toContain(`from "@zanreal/nemo"`);
    expect(read("lib/storage.ts")).toContain(`from "@zanreal/nemo/storage"`);
    expect(read("untouched.ts")).toContain(`"@rescale/nemo lives here as text"`);
    expect(JSON.parse(read("package.json")).dependencies).toEqual({ "@zanreal/nemo": "^3.0.0" });
  }, 30_000);

  it("writes nothing when run with --dry", async () => {
    const manifest = JSON.stringify({ dependencies: { "@rescale/nemo": "^2.1.0" } }, null, 2);
    const proxy = `import { createNEMO } from "@rescale/nemo";\n`;
    write("package.json", manifest);
    write("proxy.ts", proxy);

    await runMain([fixture, "--dry"]);

    expect(read("proxy.ts")).toBe(proxy);
    expect(read("package.json")).toBe(manifest);
  }, 30_000);

  it("leaves manifests alone with --skip-manifests", async () => {
    const manifest = JSON.stringify({ dependencies: { "@rescale/nemo": "^2.1.0" } }, null, 2);
    write("package.json", manifest);
    write("proxy.ts", `import { createNEMO } from "@rescale/nemo";\n`);

    await runMain([fixture, "--skip-manifests"]);

    expect(read("proxy.ts")).toContain(`"@zanreal/nemo"`);
    expect(read("package.json")).toBe(manifest);
  }, 30_000);

  it("reports a project that does not use the package", async () => {
    write("package.json", JSON.stringify({ dependencies: { next: "^15.0.0" } }, null, 2));
    write("proxy.ts", `export const proxy = () => {};\n`);

    const output = await runMain([fixture]);
    expect(output).toContain("Nothing to migrate");
  }, 30_000);

  it("prints usage for --help", async () => {
    const output = await runMain(["--help"]);
    expect(output).toContain("Usage");
    expect(output).toContain("npx @zanreal/nemo-codemod");
  });

  it("exits non-zero for a path that does not exist", async () => {
    const stub = stubExit();
    try {
      await expect(runMain([path.join(fixture, "missing")])).rejects.toThrow("exited");
    } finally {
      stub.restore();
    }
    expect(stub.codes).toEqual([1]);
    expect(stub.errors.join("\n")).toContain("Path does not exist");
  });

  it("exits non-zero when the arguments do not parse", async () => {
    const stub = stubExit();
    try {
      await expect(runMain(["--nope"])).rejects.toThrow("exited");
    } finally {
      stub.restore();
    }
    expect(stub.codes).toEqual([1]);
    expect(stub.errors.join("\n")).toContain("Unknown option: --nope");
  });

  // Half a migration is worse than none: the manifest must not start pointing at
  // @zanreal/nemo while a source file is still importing @rescale/nemo.
  it("leaves the manifest alone when a source file fails to transform", async () => {
    const manifest = JSON.stringify({ dependencies: { "@rescale/nemo": "^2.1.0" } }, null, 2);
    write("package.json", manifest);
    // Unparseable, so jscodeshift counts it as an error rather than as an unchanged file. Its
    // worker prints the parse failure on stderr while this test runs; that output is expected
    // and comes from jscodeshift, not from a failing assertion.
    write("broken.ts", `import { createNEMO from "@rescale/nemo";\n`);

    const stub = stubExit();
    try {
      await expect(runMain([fixture])).rejects.toThrow("exited");
    } finally {
      stub.restore();
    }

    expect(stub.codes).toEqual([1]);
    expect(stub.errors.join("\n")).toContain("could not be transformed");
    expect(read("package.json")).toBe(manifest);
  }, 30_000);

  // The handler of last resort, for anything main() does not catch itself.
  it("prints the error and exits non-zero when main() rejects", async () => {
    write("keep.ts", `export const keep = 1;\n`);
    // A package.json that is a dangling symlink. The walk lists it, because a symlink is not a
    // directory and the name matches, and the read that follows throws ENOENT with nothing
    // between it and the entry point.
    fs.symlinkSync(path.join(fixture, "gone.json"), path.join(fixture, "package.json"));

    const stub = stubExit();
    try {
      await expect(withArgv([fixture], runCli)).rejects.toThrow("exited");
    } finally {
      stub.restore();
    }

    expect(stub.codes).toEqual([1]);
    expect(stub.errors.join("\n")).toContain("ENOENT");
  }, 30_000);

  // `require.main === module` is false when the suite imports the file, so this is the only
  // check that running bin/cli.js as a program reaches the entry point at all.
  it("runs as a program", () => {
    const result = spawnSync(process.execPath, [CLI, "--help"], { encoding: "utf8" });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("npx @zanreal/nemo-codemod");
  }, 30_000);
});
