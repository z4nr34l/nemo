import { createMiddleware } from 'next-easy-middlewares';
import { type NextRequest, NextResponse } from 'next/server';

const middlewares = {
  '/': async (request: NextRequest) => {
    // Loop prevention
    if (request.nextUrl.pathname.startsWith('/demo')) {
      return NextResponse.next();
    }

    const nextResponse = NextResponse.redirect('http://localhost:3003/demo', {
      status: 302,
    });

    nextResponse.cookies.set({
      name: 'test',
      value: 'test',
      httpOnly: true,
      secure: true,
      path: '/',
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60 * 24 * 365,
    });

    return nextResponse;
  },
};

// Create middlewares helper
export const middleware = createMiddleware(middlewares);

export const config = {
  matcher: ['/((?!api/|_next/|_static|_vercel|[\\w-]+\\.\\w+).*)'],
};
