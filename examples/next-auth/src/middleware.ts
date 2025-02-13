import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  createMiddleware,
  type MiddlewareConfig,
  type MiddlewareFunctionProps,
} from "@rescale/nemo";

const middlewares = {
  "/page1": [
    async ({ request, forward }: MiddlewareFunctionProps) => {
      console.log("Middleware for /page1", request.nextUrl.pathname);
      const response = NextResponse.next();
      response.headers.set("x-page1-header", "page1-value");
      forward(response);
    },
    async ({ request }: MiddlewareFunctionProps) => {
      console.log("Chained middleware for /page1", request.nextUrl.pathname);
      console.log("Page1 header value:", request.headers.get("x-page1-header"));
    },
  ],
  "/page2": [
    async ({ request, forward }: MiddlewareFunctionProps) => {
      if (await auth(request as never)) {
        const response = NextResponse.next();
        response.headers.set("x-authenticated", "true");
        forward(response);
      } else {
        return NextResponse.json(
          { success: false, message: "Unauthorized" },
          { status: 401 }
        );
      }
    },
    async ({ request }: MiddlewareFunctionProps) => {
      console.log("Middleware for /page2", request.nextUrl.pathname);
      console.log(
        "Authenticated header value:",
        request.headers.get("x-authenticated")
      );
      return NextResponse.redirect("http://localhost:3002/page1");
    },
  ],
} satisfies MiddlewareConfig;

// Create middlewares helper
export const middleware = createMiddleware(middlewares);

export const config = {
  matcher: ["/((?!api/|_next/|_static|_vercel|[\\w-]+\\.\\w+).*)"],
};
