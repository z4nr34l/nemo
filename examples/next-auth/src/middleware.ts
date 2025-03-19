import { auth as authMiddleware } from "@/auth";
import {
  createNEMO,
  type GlobalMiddlewareConfig,
  type MiddlewareConfig,
} from "@rescale/nemo";
import { NextResponse } from "next/server";

const globalMiddleware: GlobalMiddlewareConfig = {
  before: async (request, event) => {
    await authMiddleware((_request, _event) => {
      const { auth } = _request;
      event.storage.set("user", auth?.user);
    })(request, event);
  }
}

const middlewares = {
  "/page1": [
    async (request) => {
      console.log("Middleware for /page1", request.nextUrl.pathname);
      const response = NextResponse.next();
      response.headers.set("x-page1-header", "page1-value");
      return response;
    },
    async (request) => {
      console.log("Chained middleware for /page1", request.nextUrl.pathname);
      console.log("Page1 header value:", request.headers.get("x-page1-header"));
    },
  ],
  "/page2": [
    async (request, event) => {
      if (event.storage.get('user')) {
        const response = NextResponse.next();
        response.headers.set("x-authenticated", "true");
        return response;
      } else {
        return NextResponse.json(
          { success: false, message: "Unauthorized" },
          { status: 401 }
        );
      }
    },
    async (request) => {
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
export const middleware = createNEMO(middlewares, globalMiddleware);

export const config = {
  matcher: ["/((?!api/|_next/|_static|_vercel|[\\w-]+\\.\\w+).*)"],
};
