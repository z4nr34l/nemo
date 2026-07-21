---
"@zanreal/nemo": patch
---

Fix `@rescale/nemo` being uninstallable at 3.0.0.

The alias declared its dependency on the library as `"@zanreal/nemo": "workspace:^"`. That
protocol is supposed to be rewritten to a real semver range when the package is published, but
the rewrite did not happen and the literal specifier reached the registry, so npm refuses to
install it:

```
npm error code EUNSUPPORTEDPROTOCOL
npm error Unsupported URL Type "workspace:": workspace:^
```

A bare `npm install @rescale/nemo` was unaffected — npm skipped the unresolvable version and
resolved 2.2.0 — but anything pinning `@3` or `@^3` failed outright, on the package whose entire
job is to keep existing installs working.

The dependency is now a literal `^3.0.0`. Local development is unchanged: the workspace still
links `packages/nemo` because its version satisfies the range.

Both packages move together as a `fixed` group, so this releases `@zanreal/nemo` too; that
version is identical to 3.0.0 in content.
