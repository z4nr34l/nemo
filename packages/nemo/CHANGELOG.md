# NEMO

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
