# @rescale/nemo — deprecated

> [!WARNING]
> **This package has moved to [`@zanreal/nemo`](https://www.npmjs.com/package/@zanreal/nemo).**
> `@rescale/nemo` is now a thin alias that re-exports `@zanreal/nemo`. It still works, but it
> will not receive new features or fixes of its own. Please migrate.

## Migrate

A codemod handles the imports and your `package.json` in one pass:

```bash
npx @zanreal/nemo-codemod
npm install
```

Or do it by hand — it is only a rename:

```bash
npm uninstall @rescale/nemo && npm install @zanreal/nemo
```

```diff
- import { createNEMO } from '@rescale/nemo';
+ import { createNEMO } from '@zanreal/nemo';
```

That is the whole migration. **The API is identical** — same exports, same signatures, same
behaviour. Only the package name changed.

Subpath imports move the same way:

```diff
- import { MemoryStorageAdapter } from '@rescale/nemo/storage';
+ import { MemoryStorageAdapter } from '@zanreal/nemo/storage';
```

## Why

NEMO is maintained by [ZanReal](https://zanreal.com), and the package now lives under the
organisation's own npm scope alongside the rest of its open source work. Keeping `@rescale/nemo`
published as an alias means nothing breaks for the projects already depending on it.

## Documentation

Full docs: [nemo.zanreal.com](https://nemo.zanreal.com) ·
Migration guide: [nemo.zanreal.com/docs/2.0/migration](https://nemo.zanreal.com/docs/2.0/migration)
