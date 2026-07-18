/**
 * Rewrites every module specifier that points at `@rescale/nemo` so it points at
 * `@zanreal/nemo` instead, preserving subpaths.
 *
 *   import { createNEMO } from '@rescale/nemo';          -> '@zanreal/nemo'
 *   import { MemoryStorageAdapter } from '@rescale/nemo/storage'; -> '@zanreal/nemo/storage'
 *
 * Only specifier positions are touched — a `@rescale/nemo` mentioned in a comment or in an
 * unrelated string stays untouched, which is the whole reason this is an AST transform and
 * not a find and replace.
 */

const OLD = "@rescale/nemo";
const NEW = "@zanreal/nemo";

/**
 * @param {string} value raw specifier
 * @returns {string | null} the rewritten specifier, or null when it is not ours
 */
function remap(value) {
  if (value === OLD) return NEW;
  if (value.startsWith(`${OLD}/`)) return NEW + value.slice(OLD.length);
  return null;
}

/**
 * Specifier-bearing call expressions: require(...), import(...), jest.mock(...), vi.mock(...).
 *
 * Dynamic `import()` reaches us as a CallExpression with an `Import` callee under the babel
 * parsers, and as an ImportExpression under ESTree ones — both shapes are handled.
 */
function isSpecifierCall(node) {
  const { callee } = node;
  if (callee.type === "Import") return true;
  if (callee.type === "Identifier" && callee.name === "require") return true;
  if (
    callee.type === "MemberExpression" &&
    callee.object.type === "Identifier" &&
    callee.object.name === "require" &&
    callee.property.type === "Identifier" &&
    callee.property.name === "resolve"
  ) {
    return true;
  }
  if (
    callee.type === "MemberExpression" &&
    callee.object.type === "Identifier" &&
    ["jest", "vi"].includes(callee.object.name) &&
    callee.property.type === "Identifier" &&
    ["mock", "unmock", "doMock", "requireActual", "importActual"].includes(callee.property.name)
  ) {
    return true;
  }
  return false;
}

module.exports = function transform(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);
  let changed = 0;

  /** Rewrite a string-literal node in place when it names the old package. */
  const rewrite = (node) => {
    if (!node || typeof node.value !== "string") return;
    const next = remap(node.value);
    if (next === null) return;
    node.value = next;
    changed += 1;
  };

  // import ... from '@rescale/nemo'  |  export ... from '@rescale/nemo'
  root.find(j.ImportDeclaration).forEach((p) => rewrite(p.node.source));
  root.find(j.ExportNamedDeclaration).forEach((p) => rewrite(p.node.source));
  root.find(j.ExportAllDeclaration).forEach((p) => rewrite(p.node.source));

  // await import('@rescale/nemo')
  root.find(j.ImportExpression).forEach((p) => rewrite(p.node.source));

  // require('@rescale/nemo'), jest.mock('@rescale/nemo')
  root.find(j.CallExpression).forEach((p) => {
    if (!isSpecifierCall(p.node)) return;
    rewrite(p.node.arguments[0]);
  });

  // import type Foo = import('@rescale/nemo')  |  typeof import('@rescale/nemo')
  root.find(j.TSImportType).forEach((p) => rewrite(p.node.argument));

  // declare module '@rescale/nemo' { ... }
  root.find(j.TSModuleDeclaration).forEach((p) => rewrite(p.node.id));

  // import foo = require('@rescale/nemo')
  root.find(j.TSExternalModuleReference).forEach((p) => rewrite(p.node.expression));

  return changed > 0 ? root.toSource({ quote: "auto" }) : null;
};

module.exports.parser = "tsx";
module.exports.OLD = OLD;
module.exports.NEW = NEW;
module.exports.remap = remap;
