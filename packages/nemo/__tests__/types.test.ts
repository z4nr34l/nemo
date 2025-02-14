import { describe, expect, test } from "bun:test";
import { join } from "path";
import * as ts from "typescript";

describe("Types", () => {
  test("should compile without type errors", () => {
    const program = ts.createProgram([join(__dirname, "../src/types.ts")], {
      noEmit: true,
      strict: true,
    });

    const diagnostics = ts.getPreEmitDiagnostics(program);
    expect(diagnostics.length).toBe(0);
  });

  test("should export all required types", () => {
    const sourceFile = ts.createSourceFile(
      "types.ts",
      ts.sys.readFile(join(__dirname, "../src/types.ts")) || "",
      ts.ScriptTarget.Latest,
    );

    const expectedTypes = [
      "NextMiddleware",
      "NextMiddlewareResult",
      "MiddlewareConfig",
      "GlobalMiddlewareConfig",
      "NemoConfig",
      "ErrorHandler",
      "NemoRequest",
      "MiddlewareMetadata",
    ];

    const exportedTypes = new Set<string>();

    function visit(node: ts.Node) {
      if (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) {
        exportedTypes.add(node.name.text);
      }
      ts.forEachChild(node, visit);
    }

    visit(sourceFile);

    expectedTypes.forEach((type) => {
      expect(exportedTypes.has(type)).toBe(true);
    });
  });
});
