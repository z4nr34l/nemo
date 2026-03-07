import { checkBotId } from "botid/server";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  email: z.string().min(1).email(),
  locale: z.string().optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const verification = await checkBotId();

    if (verification.isBot) {
      return NextResponse.json(
        { status: "error", message: "Access denied" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { status: "error", message: "Invalid email address" },
        { status: 400 }
      );
    }

    const token = process.env.VERCEL_OIDC_TOKEN;
    if (!token) {
      return NextResponse.json(
        {
          status: "error",
          message:
            "Missing VERCEL_OIDC_TOKEN env (OIDC). Configure Vercel OIDC token for nemo.",
        },
        { status: 500 }
      );
    }

    const upstreamUrl =
      process.env.NEWSLETTER_SUBSCRIBE_URL ??
      "https://api.zanreal.com/api/v1/internal/newsletter/subscribe";

    const upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        email: parsed.data.email,
        locale: parsed.data.locale ?? "pl",
      }),
      cache: "no-store",
    });

    const text = await upstream.text();
    const contentType = upstream.headers.get("content-type") ?? "";

    return new NextResponse(text, {
      status: upstream.status,
      headers: { "content-type": contentType || "application/json" },
    });
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
