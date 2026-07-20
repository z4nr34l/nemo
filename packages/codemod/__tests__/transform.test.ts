import { describe, expect, it } from "bun:test";

const jscodeshift = require("jscodeshift");
const transform = require("../transforms/rescale-to-zanreal.js");

/** Runs the transform the same way the jscodeshift runner would. */
function apply(source: string, path = "input.tsx"): string | null {
  const j = jscodeshift.withParser("tsx");
  return transform({ source, path }, { jscodeshift: j, j, stats: () => {}, report: () => {} });
}

describe("remap", () => {
  it("maps the bare specifier", () => {
    expect(transform.remap("@rescale/nemo")).toBe("@zanreal/nemo");
  });

  it("preserves subpaths", () => {
    expect(transform.remap("@rescale/nemo/storage")).toBe("@zanreal/nemo/storage");
    expect(transform.remap("@rescale/nemo/storage/adapters/memory")).toBe(
      "@zanreal/nemo/storage/adapters/memory",
    );
  });

  it("ignores unrelated packages", () => {
    expect(transform.remap("@rescale/nemo-something")).toBeNull();
    expect(transform.remap("rescale/nemo")).toBeNull();
    expect(transform.remap("next/server")).toBeNull();
  });
});

describe("import rewriting", () => {
  it("rewrites named imports", () => {
    const out = apply(`import { createNEMO } from "@rescale/nemo";`);
    expect(out).toContain(`from "@zanreal/nemo"`);
    expect(out).not.toContain("@rescale/nemo");
  });

  it("rewrites subpath imports", () => {
    const out = apply(`import { MemoryStorageAdapter } from "@rescale/nemo/storage";`);
    expect(out).toContain(`"@zanreal/nemo/storage"`);
  });

  it("rewrites type-only imports", () => {
    const out = apply(`import type { MiddlewareConfig } from "@rescale/nemo";`);
    expect(out).toContain(`import type { MiddlewareConfig } from "@zanreal/nemo"`);
  });

  it("rewrites re-exports", () => {
    expect(apply(`export { createNEMO } from "@rescale/nemo";`)).toContain(`"@zanreal/nemo"`);
    expect(apply(`export * from "@rescale/nemo";`)).toContain(`"@zanreal/nemo"`);
  });

  it("rewrites dynamic imports", () => {
    const out = apply(`const m = await import("@rescale/nemo");`);
    expect(out).toContain(`import("@zanreal/nemo")`);
  });

  it("rewrites require calls", () => {
    const out = apply(`const { createNEMO } = require("@rescale/nemo");`, "input.js");
    expect(out).toContain(`require("@zanreal/nemo")`);
  });

  it("rewrites require.resolve", () => {
    const out = apply(`const p = require.resolve("@rescale/nemo");`, "input.js");
    expect(out).toContain(`require.resolve("@zanreal/nemo")`);
  });

  it("rewrites test-runner module mocks", () => {
    expect(apply(`jest.mock("@rescale/nemo");`)).toContain(`jest.mock("@zanreal/nemo")`);
    expect(apply(`vi.mock("@rescale/nemo/storage");`)).toContain(`"@zanreal/nemo/storage"`);
  });

  it("rewrites module augmentation", () => {
    const out = apply(`declare module "@rescale/nemo" { export const x: number; }`);
    expect(out).toContain(`declare module "@zanreal/nemo"`);
  });

  it("rewrites typeof import positions", () => {
    const out = apply(`type N = typeof import("@rescale/nemo");`);
    expect(out).toContain(`import("@zanreal/nemo")`);
  });

  it("handles several specifiers in one file", () => {
    const out = apply(`
      import { createNEMO } from "@rescale/nemo";
      import { StorageAdapter } from "@rescale/nemo/storage";
    `);
    expect(out).not.toContain("@rescale/nemo");
    expect(out?.match(/@zanreal\/nemo/g)).toHaveLength(2);
  });
});

describe("safety", () => {
  it("leaves the package name alone in comments and unrelated strings", () => {
    const source = [
      `// migrated away from @rescale/nemo`,
      `const docs = "see @rescale/nemo for details";`,
      `import { createNEMO } from "@rescale/nemo";`,
    ].join("\n");

    const out = apply(source);
    expect(out).toContain(`// migrated away from @rescale/nemo`);
    expect(out).toContain(`const docs = "see @rescale/nemo for details"`);
    expect(out).toContain(`import { createNEMO } from "@zanreal/nemo"`);
  });

  it("returns null when there is nothing to change", () => {
    expect(apply(`import { createNEMO } from "@zanreal/nemo";`)).toBeNull();
    expect(apply(`const a = 1;`)).toBeNull();
  });

  it("does not touch similarly named packages", () => {
    const out = apply(`import x from "@rescale/nemo-extras";`);
    expect(out).toBeNull();
  });

  it("preserves the surrounding code verbatim", () => {
    const out = apply(
      `import { createNEMO } from "@rescale/nemo";\n\nexport const proxy = createNEMO({\n  "/api": async () => {},\n});\n`,
    );
    expect(out).toContain(`export const proxy = createNEMO({`);
    expect(out).toContain(`  "/api": async () => {},`);
  });
});
