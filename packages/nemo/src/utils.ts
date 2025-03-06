import { NextResponse } from "next/server";

/**
 * Compares two NextResponse instances for deep equality
 *
 * @param response1 - First NextResponse to compare
 * @param response2 - Second NextResponse to compare
 * @returns boolean indicating if the responses are equivalent
 */
export function areResponsesEqual(
  response1: NextResponse | null | undefined,
  response2: NextResponse | null | undefined,
): boolean {
  // If both are null/undefined or references to the same object, they're equal
  if (response1 === response2) return true;

  // If only one is null/undefined, they're not equal
  if (!response1 || !response2) return false;

  // Compare status codes and text
  if (
    response1.status !== response2.status ||
    response1.statusText !== response2.statusText
  ) {
    return false;
  }

  // Compare redirect URL if present (optimization: check this before comparing all headers)
  const url1 = response1.headers.get("Location");
  const url2 = response2.headers.get("Location");
  if ((url1 !== null || url2 !== null) && url1 !== url2) return false;

  // Optimize header comparison: convert to arrays once and compare counts first
  const headers1Entries = Array.from(response1.headers.entries());
  const headers2Entries = Array.from(response2.headers.entries());

  // Quick check: if header count differs, they're not equal
  if (headers1Entries.length !== headers2Entries.length) return false;

  // Create a Map from headers1 for faster lookups
  const headers1Map = new Map(headers1Entries);

  // Check if all headers in headers2 match headers1
  for (const [key, value] of headers2Entries) {
    if (headers1Map.get(key) !== value) {
      return false;
    }
  }

  return true;
}
