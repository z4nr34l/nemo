import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  email: z.string().min(1).email(),
  locale: z.string().optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { status: "error", message: "Invalid email address" },
        { status: 400 }
      );
    }

    const upstream = await fetch("https://zanreal.com/api/newsletter/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Basic forward headers (do not forward cookies)
        "User-Agent": "nemo-docs-newsletter-proxy",
      },
      body: JSON.stringify({
        email: parsed.data.email,
        locale: parsed.data.locale ?? "en",
      }),
      // Avoid caching at any layer
      cache: "no-store",
    });

    const text = await upstream.text();

    // Pass through JSON if possible, otherwise wrap.
    const contentType = upstream.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return new NextResponse(text, {
        status: upstream.status,
        headers: { "content-type": contentType },
      });
    }

    return NextResponse.json(
      upstream.ok ? { status: "success" } : { status: "error", message: text },
      { status: upstream.status }
    );
  } catch (err) {
    return NextResponse.json(
      {
        status: "error",
        message: err instanceof Error ? err.message : "Unexpected error",
      },
      { status: 500 }
    );
  }
}
