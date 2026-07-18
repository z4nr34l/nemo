import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const { parseArgs, findManifests, migrateManifests, main, DEFAULT_RANGE } = require("../bin/cli.js");

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
  /** Runs main() with the given argv, capturing stdout instead of printing it. */
  async function runCli(args: string[]): Promise<string> {
    const argv = process.argv;
    const log = console.log;
    const output: string[] = [];
    process.argv = ["node", "cli.js", ...args];
    console.log = (...parts: unknown[]) => output.push(parts.join(" "));
    try {
      await main();
    } finally {
      console.log = log;
      process.argv = argv;
    }
    return output.join("\n");
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

    await runCli([fixture]);

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

    await runCli([fixture, "--dry"]);

    expect(read("proxy.ts")).toBe(proxy);
    expect(read("package.json")).toBe(manifest);
  }, 30_000);

  it("leaves manifests alone with --skip-manifests", async () => {
    const manifest = JSON.stringify({ dependencies: { "@rescale/nemo": "^2.1.0" } }, null, 2);
    write("package.json", manifest);
    write("proxy.ts", `import { createNEMO } from "@rescale/nemo";\n`);

    await runCli([fixture, "--skip-manifests"]);

    expect(read("proxy.ts")).toContain(`"@zanreal/nemo"`);
    expect(read("package.json")).toBe(manifest);
  }, 30_000);

  it("reports a project that does not use the package", async () => {
    write("package.json", JSON.stringify({ dependencies: { next: "^15.0.0" } }, null, 2));
    write("proxy.ts", `export const proxy = () => {};\n`);

    const output = await runCli([fixture]);
    expect(output).toContain("Nothing to migrate");
  }, 30_000);

  it("prints usage for --help", async () => {
    const output = await runCli(["--help"]);
    expect(output).toContain("Usage");
    expect(output).toContain("npx @zanreal/nemo-codemod");
  });

  it("exits non-zero for a path that does not exist", async () => {
    const exit = process.exit;
    const errorLog = console.error;
    const codes: number[] = [];
    // @ts-expect-error -- stubbed for the assertion, throws to stop main() early
    process.exit = (code: number) => {
      codes.push(code);
      throw new Error("exited");
    };
    console.error = () => {};
    try {
      await expect(runCli([path.join(fixture, "missing")])).rejects.toThrow("exited");
    } finally {
      process.exit = exit;
      console.error = errorLog;
    }
    expect(codes).toEqual([1]);
  });
});
