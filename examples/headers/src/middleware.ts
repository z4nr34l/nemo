import { NextResponse } from "next/server";
import {
  createMiddleware,
  type MiddlewareConfig,
  type MiddlewareFunctionProps,
} from "@rescale/nemo";

const middlewares = {
  "/": [
    async ({ forward }: MiddlewareFunctionProps) => {
      console.log("middleware");

      const response = NextResponse.next();

      response.headers.set("x-test-header", "test-value");
      response.headers.set("x-another-header", "another-value");

      forward(response);
    },
    async ({ request, response }: MiddlewareFunctionProps) => {
      const _response = NextResponse.next();

      // Copy headers from the request to the response
      response?.headers.forEach((value, key) => {
        _response.headers.set(key, value);
      });

      // Modify headers to test if they are carried forward
      _response.headers.set("x-demo-header", "demo-value");

      // Check if the previous headers are present
      if (
        !response?.headers.has("x-test-header") ||
        response?.headers.get("x-test-header") !== "test-value"
      ) {
        _response.headers.set("x-test-header-error", "missing or incorrect");
      }
      if (
        !response?.headers.has("x-another-header") ||
        response?.headers.get("x-another-header") !== "another-value"
      ) {
        _response.headers.set("x-another-header-error", "missing or incorrect");
      }

      // Returning new response with custom headers to user
      return _response;
    },
  ],
} satisfies MiddlewareConfig;

// Create middlewares helper
export const middleware = createMiddleware(middlewares);

export const config = {
  matcher: ["/((?!api/|_next/|_static|_vercel|[\\w-]+\\.\\w+).*)"],
};
