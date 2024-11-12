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

  it('updates request headers and cookies from middleware response', async () => {
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
    await middleware(mockRequest, mockEvent);

    expect(mockRequest.headers.get('x-custom-header')).toBe('header-value');
    expect(mockRequest.cookies.get('custom-cookie')?.name).toBe(
      'custom-cookie',
    );
    expect(mockRequest.cookies.get('custom-cookie')?.value).toBe(
      'cookie-value',
    );
  });

  it('handles global before and after middleware', async () => {
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
    const response = await middleware(mockRequest, mockEvent);

    expect(response?.headers.get('x-before-header')).toBe('before-value');
    expect(response?.headers.get('x-after-header')).toBe('after-value');
  });

  it('matches paths correctly', async () => {
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

    const response1 = await middleware(
      new NextRequest('http://localhost/page1'),
      mockEvent,
    );
    expect(response1?.body).toBeNull();

    const response2 = await middleware(
      new NextRequest('http://localhost/page2'),
      mockEvent,
    );
    expect(await response2?.text()).toBe('Page 2 response');
  });

  it('executes global before middleware', async () => {
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
    const response = await middleware(mockRequest, mockEvent);

    expect(response?.headers.get('x-before-header')).toBe('before-value');
  });

  it('executes global after middleware', async () => {
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
    const response = await middleware(mockRequest, mockEvent);

    expect(response?.headers.get('x-after-header')).toBe('after-value');
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

  it('handles multiple middleware functions for a single path', async () => {
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
    const response = await middleware(mockRequest, mockEvent);

    expect(response?.headers.get('x-middleware-1')).toBe('value1');
    expect(response?.headers.get('x-middleware-2')).toBe('value2');
  });

  it('executes only global before middleware if no path matches', async () => {
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
    const response = await middleware(mockRequest, mockEvent);

    expect(response?.headers.get('x-before-header')).toBe('before-value');
    expect(response?.headers.get('x-after-header')).toBeNull();
  });

  it('executes only global after middleware if no path matches', async () => {
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
    const response = await middleware(mockRequest, mockEvent);

    expect(response?.headers.get('x-after-header')).toBe('after-value');
    expect(response?.headers.get('x-before-header')).toBeNull();
  });

  it('executes both global before and after middleware if no path matches', async () => {
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
    const response = await middleware(mockRequest, mockEvent);

    expect(response?.headers.get('x-before-header')).toBe('before-value');
    expect(response?.headers.get('x-after-header')).toBe('after-value');
  });
});
