"use server";

import { z } from "zod";

const inputSchema = z.object({
  email: z.string().min(1).email(),
});

type ActionResult =
  | { status: "success" }
  | { status: "error"; message: string };

export async function subscribeToNewsletterAction(
  input: z.infer<typeof inputSchema>
): Promise<ActionResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "Invalid email address" };
  }

  const token = process.env.VERCEL_OIDC_TOKEN;
  if (!token) {
    return {
      status: "error",
      message:
        "Missing VERCEL_OIDC_TOKEN env (OIDC). Configure Vercel OIDC token for nemo.",
    };
  }

  const url =
    process.env.MARKETING_NEWSLETTER_SUBSCRIBE_URL ??
    process.env.NEWSLETTER_SUBSCRIBE_URL ??
    "https://api.zanreal.com/api/v1/internal/newsletter/subscribe";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ email: parsed.data.email, locale: "pl" }),
    cache: "no-store",
  });

  const json = (await res.json().catch(() => null)) as
    | { status?: string; message?: string }
    | null;

  if (!res.ok || json?.status === "error") {
    return {
      status: "error",
      message: json?.message ?? "Subscribe failed",
    };
  }

  return { status: "success" };
}
