import { createMiddleware } from 'next-easy-middlewares';
import { type NextRequest, NextResponse } from 'next/server';

const middlewares = {
  '/': async (request: NextRequest) => {
    // Loop prevention
    if (request.nextUrl.pathname.startsWith('/demo')) {
      return NextResponse.next();
    }

    request.nextUrl.pathname = 'demo/' + request.nextUrl.pathname;

    const response = NextResponse.redirect(request.nextUrl);

    response.headers.set('x-test-header', 'test-value');
    response.headers.set('x-another-header', 'another-value');

    return response;
  },
  '/demo/*': async (request: NextRequest) => {
    const response = NextResponse.next();

    // Modify headers to test if they are carried forward
    response.headers.set('x-demo-header', 'demo-value');

    // Check if the previous headers are present
    if (
      !request.headers.has('x-test-header') ||
      request.headers.get('x-test-header') !== 'test-value'
    ) {
      response.headers.set('x-test-header-error', 'missing or incorrect');
    }
    if (
      !request.headers.has('x-another-header') ||
      request.headers.get('x-another-header') !== 'another-value'
    ) {
      response.headers.set('x-another-header-error', 'missing or incorrect');
    }

    return response;
  },
};

// Create middlewares helper
export const middleware = createMiddleware(middlewares);

export const config = {
  matcher: ['/((?!api/|_next/|_static|_vercel|[\\w-]+\\.\\w+).*)'],
};
