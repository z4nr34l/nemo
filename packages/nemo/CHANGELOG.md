# NEMO

## 3.0.2

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

## 3.0.1

### Patch Changes

- 9e41266: Fix `@rescale/nemo` being uninstallable at 3.0.0.

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

## 3.0.0

### Major Changes

- 3eb4f5d: Move the package to the `@zanreal` npm scope.

  NEMO is now published as **`@zanreal/nemo`**. The public API is unchanged — same exports, same
  signatures, same behaviour — so migrating is a rename and nothing more.

  One packaging fix rides along: the `./storage/adapters/memory` subpath export pointed at a file
  the build never emitted, so `import ... from "@rescale/nemo/storage/adapters/memory"` could not
  resolve. It now points at the emitted file and works.

  `@rescale/nemo` continues to be published as a deprecated alias that re-exports
  `@zanreal/nemo`, so existing installs keep working. It will not receive features or fixes of
  its own, so please migrate — a codemod does it for you:

  ```bash
  npx @zanreal/nemo-codemod
  npm install
  ```

  Or by hand:

  ```diff
  - import { createNEMO } from '@rescale/nemo';
  + import { createNEMO } from '@zanreal/nemo';
  ```

### Patch Changes

- c759d95: Fix `Set-Cookie` being lost across the middleware chain ([#184](https://github.com/zanreal-labs/nemo/issues/184)).

  [#180](https://github.com/zanreal-labs/nemo/pull/180) switched header forwarding to `append`,
  which fixed one leg of [#178](https://github.com/zanreal-labs/nemo/issues/178), but three
  defects remained. Each is fixed here:

  - **Only the last cookie survived.** `getHeadersDiff` collapsed headers through
    `Object.fromEntries`, and `Headers.forEach` yields one entry per `set-cookie` value — so all
    but the last were discarded. Cookies are now carried onto the final response individually.
    This also affected a _single_ middleware setting several cookies, which is how chunked
    Supabase auth tokens are stored.
  - **Forwarding request headers clobbered earlier cookies.** `NextResponse.next({ request })`
    serialises the request headers into `x-middleware-request-set-cookie`, a snapshot taken when
    that middleware ran. Re-applying it with `.set()` overwrote everything appended since. The
    snapshot is now skipped — the live carrier is append-only and always a superset of it.
  - **Terminating responses dropped every cookie.** A rewrite or redirect ends the chain and was
    returned untouched, losing cookies set before it — a session refresh ahead of an i18n rewrite,
    for example. Accumulated cookies are now carried onto the terminating response, without
    duplicating any it already sets.

  Reported with a full root-cause analysis and a verified patch by
  [@stefanofa](https://github.com/stefanofa).

## 2.2.0

### Minor Changes

- 9dc114b: Minor version bump

## 2.1.1

### Patch Changes

- fcf93d0: Fix repository field in package.json by adding directory path for monorepo compatibility

## 2.1.0

### Minor Changes

- ddb756b: Migrate to Next.js 16: Add support for proxy.ts alongside middleware.ts, update types for Next.js 16 compatibility, remove example applications, update dependencies

## 2.0.2

### Patch Changes

- c796819: Updated readme, simplified peer deps versioning

## 2.0.1

### Patch Changes

- 75d4a18: Fixed module resolution due to missing storage primitives and adapters

## 2.0.0

### Major Changes

- a61236e: # Breaking Changes

  - Complete package refactoring with potential API changes
  - Migration from custom solution to Next.js native middleware API

  # Improvements

  - Achieved 100% test coverage for improved reliability
  - Enhanced performance and maintainability through code refactoring
  - Better integration with Next.js ecosystem

  # Technical Details

  - Restructured codebase architecture for better maintainability
  - Implemented comprehensive test suite with full coverage
  - Updated middleware implementation to leverage Next.js native capabilities

## 1.4

### Minor Changes

- b4ce176: Added optional response prop that contains last forwarded function's response

## 1.3.3

### Patch Changes

- 0d32698: Updated npmjs readme

## 1.3.2

### Patch Changes

- 1d739d6: Added params to middleware functions, improved docs

## 1.3.1

### Patch Changes

- 9b19520: Fixed headers forwarding due to server actions issues

## 1.3.0

### Minor Changes

- 8518674: Fixed many issues, added tests, improving docs

## 1.2.4

### Patch Changes

- d171568: Bump version of `@rescale/nemo` package to 1.2.3.

## 1.2.2

### Patch Changes

- 403c89d: Fixed global middlewares type to requiere at least one (before or after), not both

## 1.2.1

### Patch Changes

- 5a48796: Renamed package for easier to remember name

## 1.2.0

### Minor Changes

- 7c85643: Added middleware shared context and refactored middleware function props to object for more elastic approach

  Global middlewares now support chaining

### Patch Changes

- be63923: Added support for NextFetchEvent in middleware - next15 event.waitUntil

  Improved peerDeps config and types compatibility

  Removed default export - supports only named exports from now

## 1.1.6

### Patch Changes

- ecc3827: Adding provenance
- fe9e197: Adding provenance

## 1.1.5

### Patch Changes

- 65a1e1a: Automating package publishing
