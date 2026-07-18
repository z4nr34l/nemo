# @zanreal/nemo-codemod

Migrates a project from `@rescale/nemo` to [`@zanreal/nemo`](https://www.npmjs.com/package/@zanreal/nemo).

The API did not change in the move — only the package name did — so this codemod is a rename
and nothing more. It exists so you do not have to trust a find and replace across your codebase.

## Usage

```bash
npx @zanreal/nemo-codemod
```

Preview first if you'd rather look before you leap. `--dry` reports what would change without
writing anything; add `--print` to see the transformed source:

```bash
npx @zanreal/nemo-codemod --dry --print
```

Then reinstall so your lockfile picks up the new package:

```bash
npm install   # or pnpm install / yarn / bun install
```

## What it changes

**Module specifiers**, in every position they can appear:

```diff
- import { createNEMO } from '@rescale/nemo';
+ import { createNEMO } from '@zanreal/nemo';

- import type { MiddlewareConfig } from '@rescale/nemo';
+ import type { MiddlewareConfig } from '@zanreal/nemo';

- const { createNEMO } = require('@rescale/nemo');
+ const { createNEMO } = require('@zanreal/nemo');

- export * from '@rescale/nemo/storage';
+ export * from '@zanreal/nemo/storage';
```

…including dynamic `import()`, `require.resolve()`, `jest.mock()` / `vi.mock()`,
`declare module`, and `typeof import()`. Subpaths are preserved.

**Dependencies**, in every `package.json` it finds (skipping `node_modules` and build output):

```diff
  "dependencies": {
-   "@rescale/nemo": "^2.1.0"
+   "@zanreal/nemo": "^3.0.0"
  }
```

The entry keeps its position in the object so the diff stays small. If you already depend on
`@zanreal/nemo`, the stale alias entry is dropped instead of leaving you with both.

## What it does not change

It is an AST transform, not a text substitution, so it only rewrites specifier positions. A
`@rescale/nemo` in a comment, a docs string, or a changelog is left exactly as it was — usually
what you want, since those are describing history.

One caveat: the transform matches `require(...)` and `require.resolve(...)` by shape, not by
resolved binding. If you have shadowed `require` with your own local function, a call to it with
the string `'@rescale/nemo'` will be rewritten too. Rare, but worth knowing before you skim the
diff.

Lockfiles are also left alone — run your package manager's install afterwards. And if any file
fails to transform, the codemod stops before touching `package.json` and exits non-zero, rather
than renaming the dependency out from under sources that still import the old name.

## Options

| Flag | Default | |
|---|---|---|
| `--dry` | off | Preview without writing |
| `--print` | off | Print the transformed source of each changed file |
| `--dep-range <range>` | `^3.0.0` | Semver range recorded for the renamed dependency |
| `--extensions <list>` | `js,jsx,ts,tsx,mjs,cjs,mts,cts` | Which files to visit |
| `--ignore-pattern <glob>` | — | Skip paths, sources and manifests alike; repeatable |
| `--skip-manifests` | off | Only touch source files |

Paths can be passed positionally, defaulting to the current directory:

```bash
npx @zanreal/nemo-codemod src app --ignore-pattern '**/*.stories.tsx'
```

## Notes

Review the diff and run your tests before committing — that advice holds for any codemod, this
one included. If it produces something surprising,
[open an issue](https://github.com/zanreal-labs/nemo/issues) with the input that caused it.

Built on [jscodeshift](https://github.com/facebook/jscodeshift). MIT licensed.
