# @zanreal/nemo-codemod

## 1.0.0

### Major Changes

- c68ae8b: Add `@zanreal/nemo-codemod`, a codemod that migrates a project from `@rescale/nemo` to
  `@zanreal/nemo`.

  ```bash
  npx @zanreal/nemo-codemod
  ```

  It rewrites module specifiers in static and dynamic imports, `require`, `require.resolve`,
  re-exports, `declare module`, `typeof import()`, and `jest`/`vi` module mocks — and
  renames the dependency in every `package.json` it finds. Because it is an AST transform rather
  than a text substitution, mentions of `@rescale/nemo` in comments and strings are left alone.

  Supports `--dry`, `--print`, `--dep-range`, `--extensions`, `--ignore-pattern` and
  `--skip-manifests`.
