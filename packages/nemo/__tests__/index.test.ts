import { type NextFetchEvent, NextRequest, NextResponse } from 'next/server';
import {
  createMiddleware,
  type MiddlewareConfig,
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
        async ({ forward }: MiddlewareFunctionProps) => {
          const response = NextResponse.next();
          forward(response);
        },
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
        async ({ forward }: MiddlewareFunctionProps) => {
          const response = NextResponse.next();
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
        async ({ forward }: MiddlewareFunctionProps) => {
          const response = NextResponse.next();
          forward(response);
        },
      ],
    };

    const globalMiddleware = {
      before: async ({ forward }: MiddlewareFunctionProps) => {
        const response = NextResponse.next();
        forward(response);
      },
      after: async ({ forward }: MiddlewareFunctionProps) => {
        const response = NextResponse.next();
        forward(response);
      },
    };

    const middleware = createMiddleware(middlewareConfig, globalMiddleware);
    await expect(middleware(mockRequest, mockEvent)).resolves.not.toThrow();
  });

  it('matches paths correctly without errors', async () => {
    const middlewareConfig: MiddlewareConfig = {
      '/page1': [
        async ({ forward }: MiddlewareFunctionProps) => {
          const response = NextResponse.next();
          forward(response);
        },
      ],
      '/page2': [
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
        async ({ forward }: MiddlewareFunctionProps) => {
          const response = NextResponse.next();
          forward(response);
        },
      ],
    };

    const globalMiddleware = {
      before: async ({ forward }: MiddlewareFunctionProps) => {
        const response = NextResponse.next();
        forward(response);
      },
    };

    const middleware = createMiddleware(middlewareConfig, globalMiddleware);
    await expect(middleware(mockRequest, mockEvent)).resolves.not.toThrow();
  });

  it('executes global after middleware without errors', async () => {
    const middlewareConfig: MiddlewareConfig = {
      '/page1': [
        async ({ forward }: MiddlewareFunctionProps) => {
          const response = NextResponse.next();
          forward(response);
        },
      ],
    };

    const globalMiddleware = {
      after: async ({ forward }: MiddlewareFunctionProps) => {
        const response = NextResponse.next();
        forward(response);
      },
    };

    const middleware = createMiddleware(middlewareConfig, globalMiddleware);
    await expect(middleware(mockRequest, mockEvent)).resolves.not.toThrow();
  });

  it('returns NextResponse if no middleware matches the path', async () => {
    const middlewareConfig: MiddlewareConfig = {
      '/page2': [
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
        async ({ forward }: MiddlewareFunctionProps) => {
          const response = NextResponse.next();
          forward(response);
        },
        async ({ forward }: MiddlewareFunctionProps) => {
          const response = NextResponse.next();
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
        async ({ forward }: MiddlewareFunctionProps) => {
          const response = NextResponse.next();
          forward(response);
        },
      ],
    };

    const globalMiddleware = {
      before: async ({ forward }: MiddlewareFunctionProps) => {
        const response = NextResponse.next();
        forward(response);
      },
    };

    const middleware = createMiddleware(middlewareConfig, globalMiddleware);
    await expect(middleware(mockRequest, mockEvent)).resolves.not.toThrow();
  });

  it('executes only global after middleware if no path matches without errors', async () => {
    const middlewareConfig: MiddlewareConfig = {
      '/page2': [
        async ({ forward }: MiddlewareFunctionProps) => {
          const response = NextResponse.next();
          forward(response);
        },
      ],
    };

    const globalMiddleware = {
      after: async ({ forward }: MiddlewareFunctionProps) => {
        const response = NextResponse.next();
        forward(response);
      },
    };

    const middleware = createMiddleware(middlewareConfig, globalMiddleware);
    await expect(middleware(mockRequest, mockEvent)).resolves.not.toThrow();
  });

  it('executes both global before and after middleware if no path matches without errors', async () => {
    const middlewareConfig: MiddlewareConfig = {
      '/page2': [
        async ({ forward }: MiddlewareFunctionProps) => {
          const response = NextResponse.next();
          forward(response);
        },
      ],
    };

    const globalMiddleware = {
      before: async ({ forward }: MiddlewareFunctionProps) => {
        const response = NextResponse.next();
        forward(response);
      },
      after: async ({ forward }: MiddlewareFunctionProps) => {
        const response = NextResponse.next();
        forward(response);
      },
    };

    const middleware = createMiddleware(middlewareConfig, globalMiddleware);
    await expect(middleware(mockRequest, mockEvent)).resolves.not.toThrow();
  });

  it('extracts URL params correctly', async () => {
    const mockMiddleware = jest.fn(
      async ({ params }: MiddlewareFunctionProps) => {
        expect(params().id).toBe('123');
      },
    );

    const middlewareConfig: MiddlewareConfig = {
      '/page/:id': [mockMiddleware],
    };

    const middleware = createMiddleware(middlewareConfig);
    const request = new NextRequest('http://localhost/page/123');
    await middleware(request, mockEvent);

    expect(mockMiddleware).toHaveBeenCalled();
  });

  it('does not precompute params for middleware that does not use them', async () => {
    const mockMiddleware = jest.fn(
      async ({ forward }: MiddlewareFunctionProps) => {
        const response = NextResponse.next();
        forward(response);
      },
    );

    const middlewareConfig: MiddlewareConfig = {
      '/page/:id': [mockMiddleware],
    };

    const middleware = createMiddleware(middlewareConfig);
    const request = new NextRequest('http://localhost/page/123');
    await middleware(request, mockEvent);

    expect(mockMiddleware).toHaveBeenCalled();
    expect(mockMiddleware.mock.calls[0][0].params).toBeInstanceOf(Function);
  });

  it('sets cookies from response to request', async () => {
    const mockMiddleware = jest.fn(
      async ({ forward }: MiddlewareFunctionProps) => {
        const response = NextResponse.next();
        response.cookies.set('test-cookie', 'test-value');
        forward(response);
      },
    );

    const middlewareConfig: MiddlewareConfig = {
      '/page1': [mockMiddleware],
    };

    const middleware = createMiddleware(middlewareConfig);
    await middleware(mockRequest, mockEvent);

    expect(mockMiddleware).toHaveBeenCalled();
    expect(mockRequest.cookies.get('test-cookie')?.name).toBe('test-cookie');
    expect(mockRequest.cookies.get('test-cookie')?.value).toBe('test-value');
  });

  it('executes middleware functions based on pattern', async () => {
    const mockMiddleware1 = jest.fn(
      async ({ forward }: MiddlewareFunctionProps) => {
        const response = NextResponse.next();
        forward(response);
      },
    );

    const mockMiddleware2 = jest.fn(
      async ({ forward }: MiddlewareFunctionProps) => {
        const response = new NextResponse('Pattern matched');
        forward(response);
      },
    );

    const middlewareConfig: MiddlewareConfig = {
      '/page1': [mockMiddleware1],
      '/page2': [mockMiddleware2],
    };

    const middleware = createMiddleware(middlewareConfig);

    // Test for pattern '/page1'
    await middleware(new NextRequest('http://localhost/page1'), mockEvent);
    expect(mockMiddleware1).toHaveBeenCalled();
    expect(mockMiddleware2).not.toHaveBeenCalled();

    // Test for pattern '/page2'
    await middleware(new NextRequest('http://localhost/page2'), mockEvent);
    expect(mockMiddleware2).toHaveBeenCalled();
  });
});
