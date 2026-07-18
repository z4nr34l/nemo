---
"@zanreal/nemo": major
"@rescale/nemo": major
---

Move the package to the `@zanreal` npm scope.

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
