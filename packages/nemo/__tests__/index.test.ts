import { type NextFetchEvent, NextRequest, NextResponse } from 'next/server';
import {
  createMiddleware,
  forward,
  type MiddlewareConfig,
  type MiddlewareFunction,
  type MiddlewareFunctionProps,
} from '../src';

describe('createMiddleware', () => {
  let mockRequest = new NextRequest('http://localhost/page1');
  let mockEvent = {} as NextFetchEvent;
  let mockContext = new Map<string, unknown>();

  beforeEach(() => {
    mockRequest = new NextRequest('http://localhost/page1');
    mockEvent = {} as NextFetchEvent;
    mockContext = new Map<string, unknown>();
  });

  it('returns the response from the first middleware that returns a response', async () => {
    const middlewareConfig: MiddlewareConfig = {
      '/page1': [
        // eslint-disable-next-line @typescript-eslint/no-shadow -- intentional shadowing
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
        // eslint-disable-next-line @typescript-eslint/no-shadow -- intentional shadowing
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
        // eslint-disable-next-line @typescript-eslint/no-shadow -- intentional shadowing
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
        // eslint-disable-next-line @typescript-eslint/no-shadow -- intentional shadowing
        async ({ forward }: MiddlewareFunctionProps) => {
          const response = NextResponse.next();
          forward(response);
        },
      ],
    };

    const globalMiddleware = {
      // eslint-disable-next-line @typescript-eslint/no-shadow -- intentional shadowing
      before: async ({ forward }: MiddlewareFunctionProps) => {
        const response = NextResponse.next();
        forward(response);
      },
      // eslint-disable-next-line @typescript-eslint/no-shadow -- intentional shadowing
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
        // eslint-disable-next-line @typescript-eslint/no-shadow -- intentional shadowing
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
        // eslint-disable-next-line @typescript-eslint/no-shadow -- intentional shadowing
        async ({ forward }: MiddlewareFunctionProps) => {
          const response = NextResponse.next();
          forward(response);
        },
      ],
    };

    const globalMiddleware = {
      // eslint-disable-next-line @typescript-eslint/no-shadow -- intentional shadowing
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
        // eslint-disable-next-line @typescript-eslint/no-shadow -- intentional shadowing
        async ({ forward }: MiddlewareFunctionProps) => {
          const response = NextResponse.next();
          forward(response);
        },
      ],
    };

    const globalMiddleware = {
      // eslint-disable-next-line @typescript-eslint/no-shadow -- intentional shadowing
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
        // eslint-disable-next-line @typescript-eslint/no-shadow -- intentional shadowing
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
        // eslint-disable-next-line @typescript-eslint/no-shadow -- intentional shadowing
        async ({ forward }: MiddlewareFunctionProps) => {
          const response = NextResponse.next();
          forward(response);
        },
        // eslint-disable-next-line @typescript-eslint/no-shadow -- intentional shadowing
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
        // eslint-disable-next-line @typescript-eslint/no-shadow -- intentional shadowing
        async ({ forward }: MiddlewareFunctionProps) => {
          const response = NextResponse.next();
          forward(response);
        },
      ],
    };

    const globalMiddleware = {
      // eslint-disable-next-line @typescript-eslint/no-shadow -- intentional shadowing
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
        // eslint-disable-next-line @typescript-eslint/no-shadow -- intentional shadowing
        async ({ forward }: MiddlewareFunctionProps) => {
          const response = NextResponse.next();
          forward(response);
        },
      ],
    };

    const globalMiddleware = {
      // eslint-disable-next-line @typescript-eslint/no-shadow -- intentional shadowing
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
        // eslint-disable-next-line @typescript-eslint/no-shadow -- intentional shadowing
        async ({ forward }: MiddlewareFunctionProps) => {
          const response = NextResponse.next();
          forward(response);
        },
      ],
    };

    const globalMiddleware = {
      // eslint-disable-next-line @typescript-eslint/no-shadow -- intentional shadowing
      before: async ({ forward }: MiddlewareFunctionProps) => {
        const response = NextResponse.next();
        forward(response);
      },
      // eslint-disable-next-line @typescript-eslint/no-shadow -- intentional shadowing
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
      // eslint-disable-next-line @typescript-eslint/no-shadow -- intentional shadowing
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
      // eslint-disable-next-line @typescript-eslint/no-shadow -- intentional shadowing
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
      // eslint-disable-next-line @typescript-eslint/no-shadow -- intentional shadowing
      async ({ forward }: MiddlewareFunctionProps) => {
        const response = NextResponse.next();
        forward(response);
      },
    );

    const mockMiddleware2 = jest.fn(
      // eslint-disable-next-line @typescript-eslint/no-shadow -- intentional shadowing
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

  it('handles both array and single middleware functions correctly', async () => {
    const mockMiddleware1 = jest.fn(
      // eslint-disable-next-line @typescript-eslint/no-shadow -- intentional shadowing
      async ({ forward }: MiddlewareFunctionProps) => {
        const response = NextResponse.next();
        forward(response);
      },
    );

    const mockMiddleware2 = jest.fn(
      // eslint-disable-next-line @typescript-eslint/no-shadow -- intentional shadowing
      async ({ forward }: MiddlewareFunctionProps) => {
        const response = new NextResponse('Single middleware');
        forward(response);
      },
    );

    const middlewareConfig: MiddlewareConfig = {
      '/page1': [mockMiddleware1],
      '/page2': mockMiddleware2,
    };

    const middleware = createMiddleware(middlewareConfig);

    // Test for array of middleware functions
    await middleware(new NextRequest('http://localhost/page1'), mockEvent);
    expect(mockMiddleware1).toHaveBeenCalled();

    // Test for single middleware function
    await middleware(new NextRequest('http://localhost/page2'), mockEvent);
    expect(mockMiddleware2).toHaveBeenCalled();
  });

  it('chains two middleware functions and checks headers', async () => {
    const middlewareConfig: MiddlewareConfig = {
      '/page1': [
        // eslint-disable-next-line @typescript-eslint/no-shadow -- intentional shadowing
        async ({ forward }: MiddlewareFunctionProps) => {
          const response = NextResponse.next();
          response.headers.set('X-Test-Header', 'TestValue');
          forward(response);
        },
        async ({ response }: MiddlewareFunctionProps) => {
          const headerValue = response?.headers.get('X-Test-Header');
          expect(headerValue).toBe('TestValue');
          return new NextResponse('Headers are equal');
        },
      ],
    };

    const middleware = createMiddleware(middlewareConfig);
    const response = await middleware(mockRequest, mockEvent);

    expect(response).toBeInstanceOf(NextResponse);
    expect(await response?.text()).toBe('Headers are equal');
  });

  it('sets the response prop correctly for legacy middleware', async () => {
    const legacyMiddleware: MiddlewareFunction = (_request, _event) => {
      return new NextResponse('Legacy response');
    };

    const props: MiddlewareFunctionProps = {
      request: mockRequest,
      event: mockEvent,
      context: mockContext,
      params: jest.fn(),
      forward: jest.fn(),
    };

    await forward(legacyMiddleware, props);

    expect(props.response).toBeInstanceOf(NextResponse);
    expect(await props.response?.text()).toBe('Legacy response');
  });

  it('sets the response prop correctly for new middleware', async () => {
    const newMiddleware: MiddlewareFunction = ({
      request: _request,
    }: {
      request: NextRequest;
    }) => {
      return new NextResponse('New response');
    };

    const props: MiddlewareFunctionProps = {
      request: mockRequest,
      event: mockEvent,
      context: mockContext,
      params: jest.fn(),
      forward: jest.fn(),
    };

    await forward(newMiddleware, props);

    expect(props.response).toBeInstanceOf(NextResponse);
    expect(await props.response?.text()).toBe('New response');
  });

  it('response prop is undefined if middleware returns undefined', async () => {
    const undefinedMiddleware: MiddlewareFunction = () => {
      return undefined;
    };

    const props: MiddlewareFunctionProps = {
      request: mockRequest,
      event: mockEvent,
      context: mockContext,
      params: jest.fn(),
      forward: jest.fn(),
    };

    await forward(undefinedMiddleware, props);

    expect(props.response).toBeUndefined();
  });

  it('handles errors in middleware functions', async () => {
    const middlewareConfig: MiddlewareConfig = {
      '/page1': [
        async () => {
          throw new Error('Test error');
        },
      ],
    };

    const middleware = createMiddleware(middlewareConfig);
    await expect(middleware(mockRequest, mockEvent)).rejects.toThrow();
  });

  it('passes context between middleware functions', async () => {
    const middlewareConfig: MiddlewareConfig = {
      '/page1': [
        async ({ context }: MiddlewareFunctionProps) => {
          context.set('testKey', 'testValue');
        },
        async ({ context }: MiddlewareFunctionProps) => {
          expect(context.get('testKey')).toBe('testValue');
          return NextResponse.next();
        },
      ],
    };

    const middleware = createMiddleware(middlewareConfig);
    await middleware(mockRequest, mockEvent);
  });

  it('handles complex path parameters', async () => {
    const mockMiddleware = jest.fn(
      async ({ params }: MiddlewareFunctionProps) => {
        const parameters = params();
        expect(parameters.category).toBe('books');
        expect(parameters.id).toBe('123');
        expect(parameters.format).toBe('pdf');
      },
    );

    const middlewareConfig: MiddlewareConfig = {
      '/:category/:id.:format': [mockMiddleware],
    };

    const middleware = createMiddleware(middlewareConfig);
    const request = new NextRequest('http://localhost/books/123.pdf');
    await middleware(request, mockEvent);

    expect(mockMiddleware).toHaveBeenCalled();
  });

  it('merges headers from multiple middleware functions', async () => {
    const middlewareConfig: MiddlewareConfig = {
      '/page1': [
        // eslint-disable-next-line @typescript-eslint/no-shadow -- intentional shadowing
        async ({ forward }: MiddlewareFunctionProps) => {
          const response = NextResponse.next();
          response.headers.set('X-Header-1', 'Value1');
          forward(response);
        },
        // eslint-disable-next-line @typescript-eslint/no-shadow -- intentional shadowing
        async ({ forward }: MiddlewareFunctionProps) => {
          const response = NextResponse.next();
          response.headers.set('X-Header-2', 'Value2');
          forward(response);
        },
      ],
    };

    const middleware = createMiddleware(middlewareConfig);
    const response = await middleware(mockRequest, mockEvent);

    expect(response?.headers.get('x-middleware-request-x-header-1')).toBe(
      'Value1',
    );
    expect(response?.headers.get('x-middleware-request-x-header-2')).toBe(
      'Value2',
    );
  });
});
