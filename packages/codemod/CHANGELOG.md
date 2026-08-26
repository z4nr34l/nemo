# @zanreal/nemo-codemod

## 1.0.1

### Patch Changes

- f18f4c7: Ship the corrected documentation links and package metadata.

  No source change. The repository already carries the right `homepage` and the
  right README; npm does not, because both were corrected after the last publish
  and npm only refreshes package metadata and the rendered README when a new
  version is published. This releases what is already here.

  What the published packages currently show, and what they will show after this:

  - `@zanreal/nemo` homepage `https://nemo.zanreal.com` becomes
    `https://zanreal.com/docs/oss/nemo`. The old host still redirects there, so
    nothing was broken - it was pointing at the legacy site rather than the
    consolidated docs.
  - `@zanreal/nemo-codemod` homepage `https://nemo.zanreal.com/docs/2.0/migration`
    becomes `https://zanreal.com/docs/oss/nemo/latest/migration`, which is the
    current guide rather than the v2 one the old path redirects to.
  - The README on npm still links `nemo.zanreal.com/docs/2.0/...` and carries a
    SonarCloud badge keyed to the old `z4nr34l_nemo` project, so the badge on the
    npm page does not resolve. Both are already fixed in the repository.

  `@rescale/nemo` is version-locked to `@zanreal/nemo` by the `fixed` group in
  the changesets config, so it goes along and picks up the same corrections.

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
