# @rescale/nemo

A middleware composition library for Next.js applications that allows you to organize and chain middleware functions based on URL patterns.

[![codecov](https://codecov.io/gh/z4nr34l/nemo/graph/badge.svg?token=10CXWSP5BA)](https://codecov.io/gh/z4nr34l/nemo)

## Installation

```bash
npm install @rescale/nemo
```

```bash
pnpm add @rescale/nemo
```

```bash
bun add @rescale/nemo
```

## Key Features

- Path-based middleware routing
- Global middleware support (before/after)
- Context sharing between middleware via shared storage
- Support for Next.js native middleware patterns
- Request/Response header and cookie forwarding
- Middleware nesting and composition

## Middleware Composition

This example shows all possible options of NEMO usage and middlewares compositions, including nested routes:

```typescript
import { createNEMO } from '@rescale/nemo';

export default createNEMO({
  // Simple route with middleware chain
  '/api': [
    // First middleware in the chain
    async (request, { storage }) => {
      storage.set('timestamp', Date.now());
      // Continues to the next middleware
    },
    // Second middleware accesses shared storage
    async (request, { storage }) => {
      const timestamp = storage.get('timestamp');
      console.log(`Request started at: ${timestamp}`);
    }
  ],
  
  // Nested routes using object notation
  '/dashboard': {
    // This middleware runs on /dashboard
    middleware: async (request) => {
      console.log('Dashboard root');
    },
    
    // Nested route with parameter
    '/:teamId': {
      // This middleware runs on /dashboard/:teamId
      middleware: async (request, { params }) => {
        console.log(`Team dashboard: ${params.teamId}`);
      },
      
      // Further nesting with additional parameter
      '/users/:userId': async (request, { params }) => {
        console.log(`Team user: ${params.teamId}, User: ${params.userId}`);
      }
    },
    
    // Another nested route under /dashboard
    '/settings': async (request) => {
      console.log('Dashboard settings');
    }
  },
  
  // Pattern matching multiple routes
  '/(auth|login)': async (request) => {
    console.log('Auth page');
  }
});
```

Each middleware in a chain is executed in sequence until one returns a response or all are completed. Nested routes allow you to organize your middleware hierarchically, matching more specific paths while maintaining a clean structure.

## API Reference

### Types

#### `NextMiddleware`

```typescript
type NextMiddleware = (
  request: NextRequest,
  event: NemoEvent
) => NextMiddlewareResult | Promise<NextMiddlewareResult>;
```

The standard middleware function signature used in NEMO, compatible with Next.js native middleware.

#### `MiddlewareConfig`

```typescript
type MiddlewareConfig = Record<string, MiddlewareConfigValue>;
```

A configuration object that maps route patterns to middleware functions or arrays of middleware functions.

#### `GlobalMiddlewareConfig`

```typescript
type GlobalMiddlewareConfig = Partial<
  Record<"before" | "after", NextMiddleware | NextMiddleware[]>
>;
```

Configuration for global middleware that runs before or after route-specific middleware.

### Main Functions

#### `createNEMO`

```typescript
function createNEMO(
  middlewares: MiddlewareConfig,
  globalMiddleware?: GlobalMiddlewareConfig,
  config?: NemoConfig
): NextMiddleware
```

Creates a composed middleware function with enhanced features:

- Executes middleware in order (global before → path-matched middleware → global after)
- Provides shared storage context between middleware functions
- Handles errors with custom error handlers
- Supports custom storage adapters

#### `NemoConfig` options

```typescript
interface NemoConfig {
  debug?: boolean;
  silent?: boolean;
  errorHandler?: ErrorHandler;
  enableTiming?: boolean;
  storage?: StorageAdapter | (() => StorageAdapter);
}
```

## Matchers

To make it easier to understand, you can check the below examples:

### Simple route

Matches `/dashboard` route exactly.

```plaintext title="Simple route"
/dashboard
```

### Params

Path parameters allow you to capture parts of the URL path. The general pattern is `:paramName` where `paramName` is the name of the parameter that will be available in the middleware function's `event.params` object.

#### Named parameters

Named parameters are defined by prefixing a colon to the parameter name (:paramName).

```plaintext title="Named parameter"
/dashboard/:team
```

This matches `/dashboard/team1` and provides `team` param with value `team1`.

You can also place parameters in the middle of a path pattern:

```plaintext title="Parameter in the middle"
/team/:teamId/dashboard
```

This matches `/team/123/dashboard` and provides `teamId` param with value `123`.

#### Multiple parameters

You can include multiple parameters in a single pattern:

```plaintext title="Multiple parameters"
/users/:userId/posts/:postId
```

This matches `/users/123/posts/456` and provides parameters `userId: "123", postId: "456"`.

#### Custom matching parameters

Parameters can have a custom regexp pattern in parentheses, which overrides the default match:

```plaintext title="Custom parameter matching"
/icon-:size(\\d+).png
```

This matches `/icon-123.png` but not `/icon-abc.png` and provides `size` param with value `123`.

#### Optional parameters

Parameters can be suffixed with a question mark (`?`) to make them optional:

```plaintext title="Optional parameter"
/users/:userId?
```

This matches both `/users` and `/users/123`.

#### Custom prefix and suffix

Parameters can be wrapped in curly braces `{}` to create custom prefixes or suffixes:

```plaintext title="Custom prefix/suffix"
/product{-:version}?
```

This matches both `/product` and `/product-v1` and provides `version` param with value `v1` when present.

#### Zero or more segments

Parameters can be suffixed with an asterisk (`*`) to match zero or more segments:

```plaintext title="Zero or more segments"
/files/:path*
```

This matches `/files`, `/files/documents`, `/files/documents/work`, etc.

#### One or more segments

Parameters can be suffixed with a plus sign (`+`) to match one or more segments:

```plaintext title="One or more segments"
/files/:path+
```

This matches `/files/documents`, `/files/documents/work`, etc., but not `/files`.

#### OR patterns

You can match multiple pattern alternatives by using parentheses and the pipe character:

```plaintext title="OR pattern"
/(auth|login)
```

This matches both `/auth` and `/login`.

#### Unicode support

The matcher fully supports Unicode characters in both patterns and paths:

```plaintext title="Unicode support"
/café/:item
```

This matches `/café/croissant` and provides `item` param with value `croissant`.

## Debugging tool

To debug your matchers and see how parameters are extracted, you can use this tool:

[Rescale path-to-regexp debugger](https://www.rescale.build/tools/path-to-regexp)

## Usage Examples

### Basic Path-Based Middleware

```typescript
import { createNEMO } from '@rescale/nemo';

export const middleware = createNEMO({
  // Simple route
  '/api': async (request) => {
    // Handle API routes
  },
  
  // With parameter
  '/users/:userId': async (request, event) => {
    // Access parameter
    console.log(`User ID: ${event.params.userId}`);
  },
  
  // Optional pattern with custom prefix
  '/product{-:version}?': async (request, event) => {
    // event.params.version will be undefined for '/product'
    // or the version value for '/product-v1'
    console.log(`Version: ${event.params.version || 'latest'}`);
  },
  
  // Pattern with custom matching
  '/files/:filename(.*\\.pdf)': async (request, event) => {
    // Only matches PDF files
    console.log(`Processing PDF: ${event.params.filename}`);
  }
});
```

Test your patterns using the [path-to-regexp debugger](https://www.rescale.build/tools/path-to-regexp).

### Using Global Middleware

```typescript
import { createNEMO } from '@rescale/nemo';

export default createNEMO({
  '/api{/*path}': apiMiddleware,
},
{
  before: [loggerMiddleware, authMiddleware],
  after: cleanupMiddleware,
});
```

### Storage API

The Storage API allows you to share data between middleware executions:

```typescript
import { createNEMO } from '@rescale/nemo';

export default createNEMO({
  '/': [
    async (req, { storage }) => {
      // Set values
      storage.set('counter', 1);
      storage.set('items', ['a', 'b']);
      storage.set('user', { id: 1, name: 'John' });
      
      // Check if key exists
      if (storage.has('counter')) {
        // Get values (with type safety)
        const count = storage.get<number>('counter');
        const items = storage.get<string[]>('items');
        const user = storage.get<{id: number, name: string}>('user');
        
        // Delete a key
        storage.delete('counter');
      }
    }
  ]
});
```

### URL Parameters

Access URL parameters through the event's params property:

```typescript
import { createNEMO } from '@rescale/nemo';

export default createNEMO({
  '/users/:userId': async (request, event) => {
    const { userId } = event.params;
    console.log(`Processing request for user: ${userId}`);
  }
});
```

## Notes

- Middleware functions are executed in order until a Response is returned
- The storage is shared between all middleware functions in the chain
- Headers and cookies are automatically forwarded between middleware functions
- Supports Next.js native middleware pattern

## Motivation

I'm working with Next.js project for a few years now, after Vercel moved multiple `/**/_middleware.ts` files to a single `/middleware.ts` file, there was a unfilled gap - but just for now.
After a 2023 retro I had found that there is no good solution for that problem, so I took matters into my own hands. I wanted to share that motivation with everyone here, as I think that we all need to remember how it all started.

Hope it will save you some time and would make your project DX better!
