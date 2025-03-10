import { describe, expect, test } from "bun:test";
import { NextResponse } from "next/server";
import { areResponsesEqual } from "../src/utils";

describe("NEMO Utils", () => {
  describe("areResponsesEqual", () => {
    test("should return true for identical response objects", () => {
      const response1 = NextResponse.next();
      const response2 = response1;
      expect(areResponsesEqual(response1, response2)).toBe(true);
    });

    test("should return true for equivalent response objects", () => {
      const response1 = NextResponse.next({
        headers: { "x-custom-header": "value" },
      });

      const response2 = NextResponse.next({
        headers: { "x-custom-header": "value" },
      });

      expect(areResponsesEqual(response1, response2)).toBe(true);
    });

    test("should return false for responses with different status codes", () => {
      const response1 = NextResponse.next();
      const response2 = new NextResponse(null, { status: 404 });

      expect(areResponsesEqual(response1, response2)).toBe(false);
    });

    test("should return false for responses with different status text", () => {
      const response1 = new NextResponse(null, {
        status: 200,
        statusText: "OK",
      });

      const response2 = new NextResponse(null, {
        status: 200,
        statusText: "Custom Status",
      });

      expect(areResponsesEqual(response1, response2)).toBe(false);
    });

    test("should handle null or undefined responses", () => {
      const response = NextResponse.next();

      expect(areResponsesEqual(response, null)).toBe(false);
      expect(areResponsesEqual(null, response)).toBe(false);
      expect(areResponsesEqual(null, null)).toBe(true);
      expect(areResponsesEqual(undefined, undefined)).toBe(true);
    });

    test("should compare redirect URLs properly", () => {
      const redirect1 = NextResponse.redirect("http://example.com/page1");
      const redirect2 = NextResponse.redirect("http://example.com/page1");
      const redirect3 = NextResponse.redirect("http://example.com/page2");

      expect(areResponsesEqual(redirect1, redirect2)).toBe(true);
      expect(areResponsesEqual(redirect1, redirect3)).toBe(false);
    });

    test("should compare headers with different counts", () => {
      const response1 = NextResponse.next({
        headers: {
          "x-header-1": "value1",
          "x-header-2": "value2",
        },
      });

      const response2 = NextResponse.next({
        headers: {
          "x-header-1": "value1",
        },
      });

      expect(areResponsesEqual(response1, response2)).toBe(false);
    });

    test("should compare headers with same keys but different values", () => {
      const response1 = NextResponse.next({
        headers: {
          "x-header-1": "value1",
          "x-header-2": "value2",
        },
      });

      const response2 = NextResponse.next({
        headers: {
          "x-header-1": "value1",
          "x-header-2": "different",
        },
      });

      expect(areResponsesEqual(response1, response2)).toBe(false);
    });

    test("should handle responses with complex headers", () => {
      const response1 = NextResponse.next();
      response1.headers.set("x-custom-1", "value1");
      response1.headers.set("x-custom-2", "value2");

      const response2 = NextResponse.next();
      response2.headers.set("x-custom-1", "value1");
      response2.headers.set("x-custom-2", "value2");

      expect(areResponsesEqual(response1, response2)).toBe(true);

      // Modify one header
      response2.headers.set("x-custom-2", "modified");
      expect(areResponsesEqual(response1, response2)).toBe(false);
    });

    test("should handle JSON responses", () => {
      const json1 = NextResponse.json({ data: "test" });
      const json2 = NextResponse.json({ data: "test" });
      const json3 = NextResponse.json({ data: "different" });

      expect(areResponsesEqual(json1, json2)).toBe(true);
      expect(areResponsesEqual(json1, json3)).toBe(true); // Should be true as we don't compare body content
    });

    test("should handle rewrite responses", () => {
      const response1 = NextResponse.next();
      response1.headers.set(
        "x-middleware-rewrite",
        "http://example.com/new-path",
      );

      const response2 = NextResponse.next();
      response2.headers.set(
        "x-middleware-rewrite",
        "http://example.com/new-path",
      );

      const response3 = NextResponse.next();
      response3.headers.set(
        "x-middleware-rewrite",
        "http://example.com/different-path",
      );

      expect(areResponsesEqual(response1, response2)).toBe(true);
      expect(areResponsesEqual(response1, response3)).toBe(false);
    });
  });
});
