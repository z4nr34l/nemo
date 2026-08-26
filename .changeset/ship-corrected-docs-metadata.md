---
"@zanreal/nemo": patch
"@zanreal/nemo-codemod": patch
---

Ship the corrected documentation links and package metadata.

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
