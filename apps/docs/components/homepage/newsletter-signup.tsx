"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { z } from "zod";

const newsletterSchema = z.object({
  email: z.string().min(1).email(),
});

type SubmitState =
  | { type: "idle"; email: string }
  | { type: "sending"; email: string }
  | { type: "success"; email: string }
  | { type: "error"; email: string; message: string };

export function NewsletterSignup({ className }: { className?: string }) {
  const [state, setState] = useState<SubmitState>({ type: "idle", email: "" });

  const isSubmitting = state.type === "sending";

  const canSubmit = useMemo(() => {
    if (isSubmitting) return false;
    return newsletterSchema.safeParse({ email: state.email }).success;
  }, [isSubmitting, state.email]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const parsed = newsletterSchema.safeParse({ email: state.email });
    if (!parsed.success) {
      setState((s) => ({
        type: "error",
        email: s.email,
        message: "Podaj poprawny adres e-mail.",
      }));
      return;
    }

    setState((s) => ({ type: "sending", email: s.email }));

    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: parsed.data.email, locale: "pl" }),
      });

      const json = (await res.json().catch(() => null)) as
        | { status?: string; message?: string }
        | null;

      if (!res.ok || json?.status === "error") {
        setState((s) => ({
          type: "error",
          email: s.email,
          message: json?.message ?? "Coś poszło nie tak. Spróbuj ponownie.",
        }));
        return;
      }

      setState((s) => ({ type: "success", email: s.email }));
    } catch {
      setState((s) => ({
        type: "error",
        email: s.email,
        message: "Błąd sieci. Spróbuj ponownie.",
      }));
    }
  }

  return (
    <section className={cn("p-8 lg:px-12 lg:py-12 bg-background", className)}>
      <div className="flex flex-col gap-2">
        <h3 className="font-bold text-3xl">Newsletter ZanReal</h3>
        <p className="text-muted-foreground">
          Dostawaj aktualności o nowych projektach, release’ach i materiałach.
        </p>
      </div>

      <div className="mt-6">
        {state.type === "success" ? (
          <div className="flex items-center gap-2 py-2 text-sm">
            <CheckCircle2 className="size-5 shrink-0 text-green-600" />
            <span>Dzięki! Sprawdź skrzynkę, żeby potwierdzić subskrypcję.</span>
          </div>
        ) : (
          <form
            className="flex w-full flex-col gap-3 sm:flex-row"
            noValidate
            onSubmit={onSubmit}
          >
            <input
              aria-label="Email"
              className={cn(
                "h-10 w-full rounded-full border border-input bg-background px-4 text-sm",
                "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                state.type === "error" ? "border-red-500" : ""
              )}
              disabled={isSubmitting}
              placeholder="Twój e-mail"
              type="email"
              value={state.email}
              onChange={(e) =>
                setState({ type: "idle", email: e.target.value })
              }
            />

            <Button
              className="group shrink-0 rounded-full"
              disabled={!canSubmit}
              type="submit"
            >
              Zapisz się
              <span className="ml-2 flex size-8 items-center justify-center rounded-full bg-background text-foreground">
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ArrowRight className="size-4 -rotate-45 transition-transform group-hover:rotate-0" />
                )}
              </span>
            </Button>
          </form>
        )}

        {state.type === "error" && (
          <p className="mt-2 text-sm text-red-500">{state.message}</p>
        )}

        <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
          Zapisując się do newslettera wyrażasz zgodę na przetwarzanie danych
          osobowych w celu wysyłki newslettera. Więcej informacji: {" "}
          <Link
            className="underline underline-offset-2"
            href="https://zanreal.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            polityka prywatności
          </Link>
          {" "}oraz{" "}
          <Link
            className="underline underline-offset-2"
            href="https://zanreal.com/newsletter"
            target="_blank"
            rel="noopener noreferrer"
          >
            newsletter
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
