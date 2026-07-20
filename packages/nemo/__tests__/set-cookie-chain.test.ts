import { describe, expect, test } from "bun:test";
import { NextRequest, NextResponse } from "next/server";
import { createNEMO } from "../src";
import type { NextMiddleware } from "../src/types";
import { NemoEvent } from "../src/event";

/**
 * Regression tests for issue #184 — Set-Cookie lost across the middleware chain.
 *
 * #178 reported that only one cookie survived when several middleware each set one. #180
 * switched `applyHeadersToRequest` to append, which fixed one leg of it, but three separate
 * defects remained. Each mode below pins one of them, so a regression points at a cause
 * rather than just "cookies broke again":
 *
 *   A — Headers.forEach yields one entry per set-cookie, and getHeadersDiff collapsed them
 *       through Object.fromEntries, keeping only the last.
 *   B — x-middleware-request-set-cookie is a *snapshot* of the carrier taken when the
 *       middleware ran; re-applying it with .set() clobbered anything appended since.
 *   C — a terminating rewrite/redirect was returned as-is, dropping the carrier entirely.
 *   D — the single-middleware case of A, which is how chunked Supabase auth tokens break.
 */

const event = () =>
  NemoEvent.from(new NextRequest("https://example.com/"), {} as never);

const run = (middleware: NextMiddleware[]) =>
  (
    createNEMO({}, { before: middleware })(
      new NextRequest("https://example.com/"),
      event(),
    ) as Promise<Response>
  ).then((response) => response.headers.getSetCookie());

/** Sets one cookie on a plain NextResponse.next(). */
const plainCookie =
  (name: string): NextMiddleware =>
  () => {
    const response = NextResponse.next();
    response.cookies.set(name, "value", { path: "/" });
    return response;
  };

/** Sets a cookie while forwarding request headers — the Supabase SSR pattern. */
const forwardingCookie =
  (name: string): NextMiddleware =>
  (request) => {
    const response = NextResponse.next({
      request: { headers: request.headers },
    });
    response.cookies.set(name, "value", { path: "/" });
    return response;
  };

describe("Set-Cookie across the middleware chain (#184)", () => {
  test("A: keeps cookies from every middleware in the chain", async () => {
    const cookies = await run([plainCookie("ID_1"), plainCookie("ID_2")]);

    expect(cookies).toEqual(["ID_1=value; Path=/", "ID_2=value; Path=/"]);
  });

  test("B: keeps cookies when middleware forward request headers", async () => {
    const cookies = await run([
      forwardingCookie("ID_1"),
      forwardingCookie("ID_2"),
    ]);

    expect(cookies).toEqual(["ID_1=value; Path=/", "ID_2=value; Path=/"]);
  });

  test("C: carries cookies onto a terminating rewrite", async () => {
    const cookies = await run([
      plainCookie("ID_1"),
      (request) => NextResponse.rewrite(new URL("/en", request.url)),
    ]);

    expect(cookies).toEqual(["ID_1=value; Path=/"]);
  });

  test("C: carries cookies onto a terminating redirect", async () => {
    const cookies = await run([
      plainCookie("session"),
      (request) => NextResponse.redirect(new URL("/login", request.url)),
    ]);

    expect(cookies).toEqual(["session=value; Path=/"]);
  });

  test("D: keeps multiple cookies set by a single middleware", async () => {
    const cookies = await run([
      () => {
        const response = NextResponse.next();
        response.cookies.set("token.0", "chunk0", { path: "/" });
        response.cookies.set("token.1", "chunk1", { path: "/" });
        return response;
      },
    ]);

    expect(cookies).toEqual([
      "token.0=chunk0; Path=/",
      "token.1=chunk1; Path=/",
    ]);
  });

  test("mixes plain and header-forwarding middleware without loss", async () => {
    const cookies = await run([
      plainCookie("ID_1"),
      forwardingCookie("ID_2"),
      plainCookie("ID_3"),
    ]);

    expect(cookies).toEqual([
      "ID_1=value; Path=/",
      "ID_2=value; Path=/",
      "ID_3=value; Path=/",
    ]);
  });

  test("does not duplicate a cookie already present on a terminating response", async () => {
    const cookies = await run([
      plainCookie("ID_1"),
      (request) => {
        const response = NextResponse.redirect(new URL("/login", request.url));
        response.cookies.set("ID_1", "value", { path: "/" });
        return response;
      },
    ]);

    expect(cookies).toEqual(["ID_1=value; Path=/"]);
  });

  test("leaves responses without cookies untouched", async () => {
    const cookies = await run([() => NextResponse.next()]);

    expect(cookies).toEqual([]);
  });

  /**
   * `Response.redirect()` returns headers with an immutable guard, so appending throws
   * `TypeError: immutable` on Node — which would take the whole chain down rather than lose a
   * cookie. Bun does not enforce that guard, so the runtime this suite runs on cannot reproduce
   * it directly; the guard is simulated instead.
   */
  test("carries cookies onto a response with immutable headers", async () => {
    const immutableRedirect = () => {
      const response = new Response(null, {
        status: 307,
        headers: { location: "/login" },
      });
      Object.defineProperty(response.headers, "append", {
        value: () => {
          throw new TypeError("immutable");
        },
        configurable: true,
      });
      return response as never;
    };

    const response = (await createNEMO(
      {},
      {
        before: [plainCookie("ID_1"), immutableRedirect] as NextMiddleware[],
      },
    )(new NextRequest("https://example.com/"), event())) as Response;

    expect(response.headers.getSetCookie()).toEqual(["ID_1=value; Path=/"]);
    // the redirect itself must survive intact
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("/login");
  });
});
