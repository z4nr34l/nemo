---
"@zanreal/nemo": major
"@rescale/nemo": major
---

Move the package to the `@zanreal` npm scope.

NEMO is now published as **`@zanreal/nemo`**. The API is unchanged — same exports, same
signatures, same behaviour — only the package name is different.

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
