"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { newsletterSchema } from "@/components/homepage/newsletter-schema";

type ErrorReason = "network" | "server";

type SubmitState =
  | { type: "idle" }
  | { type: "sending"; email: string }
  | { type: "success"; email: string }
  | { type: "already_subscribed"; email: string }
  | { type: "error"; email: string; reason: ErrorReason };

interface NewsletterFormProps {
  locale: string;
  variant?: "chat" | "inline";
}

function useNewsletterForm(locale: string) {
  const [submitState, setSubmitState] = useState<SubmitState>({ type: "idle" });
  const [email, setEmail] = useState<string>("");

  const handleSubmit = async () => {
    const parsed = newsletterSchema.safeParse({ email });
    if (!parsed.success) return;

    setSubmitState({ type: "sending", email });

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale }),
      });

      const result = (await response.json().catch(() => null)) as
        | { status?: "success" | "already_subscribed" | "error"; message?: string }
        | null;

      if (response.ok && result?.status === "success") {
        setSubmitState({ type: "success", email });
        setEmail("");
        return;
      }

      if (response.ok && result?.status === "already_subscribed") {
        setSubmitState({ type: "already_subscribed", email });
        setEmail("");
        return;
      }

      setSubmitState({ type: "error", email, reason: "server" });
    } catch {
      setSubmitState({ type: "error", email, reason: "network" });
    }
  };

  return { submitState, setSubmitState, email, setEmail, handleSubmit };
}

function ChatStatusIndicator({ state }: { state: SubmitState }) {
  if (state.type === "sending") return <span className="animate-pulse">Sending…</span>;
  if (state.type === "success" || state.type === "already_subscribed")
    return <span>Read</span>;
  if (state.type === "error")
    return <span>{state.reason === "network" ? "Failed to send" : "Server error"}</span>;
  return null;
}

function InlineForm({ locale }: { locale: string }) {
  const { submitState, email, setEmail, handleSubmit } = useNewsletterForm(locale);

  if (submitState.type === "success" || submitState.type === "already_subscribed") {
    return (
      <div className="flex items-center gap-2 py-2 text-sm">
        <CheckCircle2 className="size-5 shrink-0 text-green-600" />
        <span>
          {submitState.type === "success"
            ? "Dzięki! Sprawdź skrzynkę, żeby potwierdzić subskrypcję."
            : "Już jesteś zapisany/a."}
        </span>
      </div>
    );
  }

  const isSubmitting = submitState.type === "sending";
  const isValid = newsletterSchema.safeParse({ email }).success;

  return (
    <form
      className="flex w-full flex-col gap-3 sm:flex-row"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }}
    >
      <input
        aria-label="Email"
        className="h-10 w-full rounded-full border border-input bg-background px-4 text-sm"
        disabled={isSubmitting}
        placeholder="Twój e-mail"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <Button className="group shrink-0 rounded-full" disabled={isSubmitting || !isValid} type="submit">
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
  );
}

function ChatForm({ locale }: { locale: string }) {
  const { submitState, setSubmitState, email, setEmail, handleSubmit } = useNewsletterForm(locale);

  const showInput = submitState.type === "idle" || submitState.type === "error";

  return (
    <div className="flex flex-col">
      {submitState.type !== "idle" && (
        <div className="flex flex-col items-end gap-1 px-4 pb-3">
          <div className="ml-auto w-fit max-w-[80%] animate-[fadeSlideIn_0.3s_ease-out_both] rounded-2xl rounded-br-sm bg-foreground px-4 py-2.5 text-background text-sm">
            {submitState.email}
          </div>
          <div
            className={cn(
              "animate-[fadeSlideIn_0.3s_ease-out_0.3s_both] pr-1 text-xs",
              submitState.type === "error" ? "text-red-500" : "text-muted-foreground"
            )}
          >
            <ChatStatusIndicator state={submitState} />
          </div>
        </div>
      )}

      {(submitState.type === "success" || submitState.type === "already_subscribed") && (
        <div className="px-4 pb-3">
          <div className="w-fit max-w-[80%] animate-[fadeSlideIn_0.4s_ease-out_0.6s_both] rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5 text-sm">
            {submitState.type === "success"
              ? "Thanks! Check your inbox to confirm."
              : "You're already subscribed."}
          </div>
        </div>
      )}

      {showInput && (
        <form
          className="flex items-center gap-2 border-t px-4 py-3"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
          <input
            aria-label="Email"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Twój e-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={
              submitState.type === "error" ? () => setSubmitState({ type: "idle" }) : undefined
            }
          />
          <button
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-opacity hover:opacity-80"
            type="submit"
          >
            <ArrowRight className="size-4" />
          </button>
        </form>
      )}
    </div>
  );
}

export function NewsletterForm({ locale, variant = "inline" }: NewsletterFormProps) {
  if (variant === "inline") return <InlineForm locale={locale} />;
  return <ChatForm locale={locale} />;
}
