import {
  createMiddleware,
  type MiddlewareConfig,
  MiddlewareFunctionProps,
} from "@rescale/nemo";
import { NextResponse } from "next/server";

const middlewares = {
  "/": [
    async ({ request, forward }: MiddlewareFunctionProps) => {
      // Loop prevention
      if (request.nextUrl.pathname.startsWith("/demo")) {
        return NextResponse.next();
      }

      request.nextUrl.pathname = "demo/" + request.nextUrl.pathname;

      const response = NextResponse.redirect(request.nextUrl);

      // Set a cookie
      response.cookies.set("nemo", "demo");

      forward(response);
    },
    async ({ request }: MiddlewareFunctionProps) => {
      console.log(request.cookies.get("nemo"));
    },
  ],
} satisfies MiddlewareConfig;

// Create middlewares helper
export const middleware = createMiddleware(middlewares);

export const config = {
  matcher: ["/((?!api/|_next/|_static|_vercel|[\\w-]+\\.\\w+).*)"],
};
