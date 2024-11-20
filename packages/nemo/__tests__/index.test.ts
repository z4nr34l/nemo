import { type NextFetchEvent, NextRequest, NextResponse } from 'next/server';
import {
  createMiddleware,
  type MiddlewareConfig,
  type MiddlewareFunction,
  type MiddlewareFunctionProps,
} from '../src';

describe('createMiddleware', () => {
  let mockRequest = new NextRequest('http://localhost/page1');
  let mockEvent = {} as NextFetchEvent;

  beforeEach(() => {
    mockRequest = new NextRequest('http://localhost/page1');
    mockEvent = {} as NextFetchEvent;
  });

  it('returns the response from the first middleware that returns a response', async () => {
    const middlewareConfig: MiddlewareConfig = {
      '/page1': [
        // eslint-disable-next-line @typescript-eslint/require-await -- don't need that here
        async ({ forward }: MiddlewareFunctionProps) => {
          const response = NextResponse.next();
          forward(response);
        },
        // eslint-disable-next-line @typescript-eslint/require-await -- don't need that here
        async () => {
          return new NextResponse('Final response');
        },
      ],
    };

    const middleware = createMiddleware(middlewareConfig);
    const response = await middleware(mockRequest, mockEvent);

    expect(response).toBeInstanceOf(NextResponse);
    expect(await response?.text()).toBe('Final response');
  });

  it('returns NextResponse.next() if no middleware returns a response', async () => {
    const middlewareConfig: MiddlewareConfig = {
      '/page1': [
        // eslint-disable-next-line @typescript-eslint/require-await -- don't need that here
        async ({ forward }: MiddlewareFunctionProps) => {
          const response = NextResponse.next();
          forward(response);
        },
      ],
    };

    const middleware = createMiddleware(middlewareConfig);
    const response = await middleware(mockRequest, mockEvent);

    expect(response).toBeInstanceOf(NextResponse);
    expect(response?.body).toBeNull();
  });

  it('executes middleware without errors', async () => {
    const middlewareConfig: MiddlewareConfig = {
      '/page1': [
        // eslint-disable-next-line @typescript-eslint/require-await -- don't need that here
        async ({ forward }: MiddlewareFunctionProps) => {
          const response = NextResponse.next();
          response.headers.set('x-custom-header', 'header-value');
          response.cookies.set('custom-cookie', 'cookie-value');
          forward(response);
        },
      ],
    };

    const middleware = createMiddleware(middlewareConfig);
    await expect(middleware(mockRequest, mockEvent)).resolves.not.toThrow();
  });

  it('handles global before and after middleware without errors', async () => {
    const middlewareConfig: MiddlewareConfig = {
      '/page1': [
        // eslint-disable-next-line @typescript-eslint/require-await -- don't need that here
        async ({ forward }: MiddlewareFunctionProps) => {
          const response = NextResponse.next();
          forward(response);
        },
      ],
    };

    const globalMiddleware = {
      // eslint-disable-next-line @typescript-eslint/require-await -- don't need that here
      before: async ({ forward }: MiddlewareFunctionProps) => {
        const response = NextResponse.next();
        response.headers.set('x-before-header', 'before-value');
        forward(response);
      },
      // eslint-disable-next-line @typescript-eslint/require-await -- don't need that here
      after: async ({ forward }: MiddlewareFunctionProps) => {
        const response = NextResponse.next();
        response.headers.set('x-after-header', 'after-value');
        forward(response);
      },
    } satisfies Partial<
      Record<'before' | 'after', MiddlewareFunction | MiddlewareFunction[]>
    >;

    const middleware = createMiddleware(middlewareConfig, globalMiddleware);
    await expect(middleware(mockRequest, mockEvent)).resolves.not.toThrow();
  });

  it('matches paths correctly without errors', async () => {
    const middlewareConfig: MiddlewareConfig = {
      '/page1': [
        // eslint-disable-next-line @typescript-eslint/require-await -- don't need that here
        async ({ forward }: MiddlewareFunctionProps) => {
          const response = NextResponse.next();
          forward(response);
        },
      ],
      '/page2': [
        // eslint-disable-next-line @typescript-eslint/require-await -- don't need that here
        async () => {
          return new NextResponse('Page 2 response');
        },
      ],
    };

    const middleware = createMiddleware(middlewareConfig);

    await expect(
      middleware(new NextRequest('http://localhost/page1'), mockEvent),
    ).resolves.not.toThrow();

    await expect(
      middleware(new NextRequest('http://localhost/page2'), mockEvent),
    ).resolves.not.toThrow();
  });

  it('executes global before middleware without errors', async () => {
    const middlewareConfig: MiddlewareConfig = {
      '/page1': [
        // eslint-disable-next-line @typescript-eslint/require-await -- don't need that here
        async ({ forward }: MiddlewareFunctionProps) => {
          const response = NextResponse.next();
          forward(response);
        },
      ],
    };

    const globalMiddleware = {
      // eslint-disable-next-line @typescript-eslint/require-await -- don't need that here
      before: async ({ forward }: MiddlewareFunctionProps) => {
        const response = NextResponse.next();
        response.headers.set('x-before-header', 'before-value');
        forward(response);
      },
    };

    const middleware = createMiddleware(middlewareConfig, globalMiddleware);
    await expect(middleware(mockRequest, mockEvent)).resolves.not.toThrow();
  });

  it('executes global after middleware without errors', async () => {
    const middlewareConfig: MiddlewareConfig = {
      '/page1': [
        // eslint-disable-next-line @typescript-eslint/require-await -- don't need that here
        async ({ forward }: MiddlewareFunctionProps) => {
          const response = NextResponse.next();
          forward(response);
        },
      ],
    };

    const globalMiddleware = {
      // eslint-disable-next-line @typescript-eslint/require-await -- don't need that here
      after: async ({ forward }: MiddlewareFunctionProps) => {
        const response = NextResponse.next();
        response.headers.set('x-after-header', 'after-value');
        forward(response);
      },
    };

    const middleware = createMiddleware(middlewareConfig, globalMiddleware);
    await expect(middleware(mockRequest, mockEvent)).resolves.not.toThrow();
  });

  it('returns NextResponse if no middleware matches the path', async () => {
    const middlewareConfig: MiddlewareConfig = {
      '/page2': [
        // eslint-disable-next-line @typescript-eslint/require-await -- don't need that here
        async ({ forward }: MiddlewareFunctionProps) => {
          const response = NextResponse.next();
          forward(response);
        },
      ],
    };

    const middleware = createMiddleware(middlewareConfig);
    const response = await middleware(mockRequest, mockEvent);

    expect(response).toBeInstanceOf(NextResponse);
    expect(response?.body).toBeNull();
  });

  it('handles multiple middleware functions for a single path without errors', async () => {
    const middlewareConfig: MiddlewareConfig = {
      '/page1': [
        // eslint-disable-next-line @typescript-eslint/require-await -- don't need that here
        async ({ forward }: MiddlewareFunctionProps) => {
          const response = NextResponse.next();
          response.headers.set('x-middleware-1', 'value1');
          forward(response);
        },
        // eslint-disable-next-line @typescript-eslint/require-await -- don't need that here
        async ({ forward }: MiddlewareFunctionProps) => {
          const response = NextResponse.next();
          response.headers.set('x-middleware-2', 'value2');
          forward(response);
        },
      ],
    };

    const middleware = createMiddleware(middlewareConfig);
    await expect(middleware(mockRequest, mockEvent)).resolves.not.toThrow();
  });

  it('executes only global before middleware if no path matches without errors', async () => {
    const middlewareConfig: MiddlewareConfig = {
      '/page2': [
        // eslint-disable-next-line @typescript-eslint/require-await -- don't need that here
        async ({ forward }: MiddlewareFunctionProps) => {
          const response = NextResponse.next();
          forward(response);
        },
      ],
    };

    const globalMiddleware = {
      // eslint-disable-next-line @typescript-eslint/require-await -- don't need that here
      before: async ({ forward }: MiddlewareFunctionProps) => {
        const response = NextResponse.next();
        response.headers.set('x-before-header', 'before-value');
        forward(response);
      },
    };

    const middleware = createMiddleware(middlewareConfig, globalMiddleware);
    await expect(middleware(mockRequest, mockEvent)).resolves.not.toThrow();
  });

  it('executes only global after middleware if no path matches without errors', async () => {
    const middlewareConfig: MiddlewareConfig = {
      '/page2': [
        // eslint-disable-next-line @typescript-eslint/require-await -- don't need that here
        async ({ forward }: MiddlewareFunctionProps) => {
          const response = NextResponse.next();
          forward(response);
        },
      ],
    };

    const globalMiddleware = {
      // eslint-disable-next-line @typescript-eslint/require-await -- don't need that here
      after: async ({ forward }: MiddlewareFunctionProps) => {
        const response = NextResponse.next();
        response.headers.set('x-after-header', 'after-value');
        forward(response);
      },
    };

    const middleware = createMiddleware(middlewareConfig, globalMiddleware);
    await expect(middleware(mockRequest, mockEvent)).resolves.not.toThrow();
  });

  it('executes both global before and after middleware if no path matches without errors', async () => {
    const middlewareConfig: MiddlewareConfig = {
      '/page2': [
        // eslint-disable-next-line @typescript-eslint/require-await -- don't need that here
        async ({ forward }: MiddlewareFunctionProps) => {
          const response = NextResponse.next();
          forward(response);
        },
      ],
    };

    const globalMiddleware = {
      // eslint-disable-next-line @typescript-eslint/require-await -- don't need that here
      before: async ({ forward }: MiddlewareFunctionProps) => {
        const response = NextResponse.next();
        response.headers.set('x-before-header', 'before-value');
        forward(response);
      },
      // eslint-disable-next-line @typescript-eslint/require-await -- don't need that here
      after: async ({ forward }: MiddlewareFunctionProps) => {
        const response = NextResponse.next();
        response.headers.set('x-after-header', 'after-value');
        forward(response);
      },
    };

    const middleware = createMiddleware(middlewareConfig, globalMiddleware);
    await expect(middleware(mockRequest, mockEvent)).resolves.not.toThrow();
  });
});
