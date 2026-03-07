"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { type NewsletterFormData, newsletterSchema } from "./newsletter-schema";

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

function strings(locale: string) {
  const pl = {
    emailPlaceholder: "Twój e-mail",
    subscribe: "Zapisz się",
    successMessage: "Dzięki! Sprawdź skrzynkę, żeby potwierdzić subskrypcję.",
    alreadySubscribed: "Już jesteś zapisany/a.",
    chatSending: "Wysyłam…",
    chatRead: "Wysłano",
    chatFailedNetwork: "Błąd sieci",
    chatFailedServer: "Błąd serwera",
  };

  const en = {
    emailPlaceholder: "Your email",
    subscribe: "Subscribe",
    successMessage: "Thanks! Check your inbox to confirm.",
    alreadySubscribed: "You're already subscribed.",
    chatSending: "Sending…",
    chatRead: "Sent",
    chatFailedNetwork: "Network error",
    chatFailedServer: "Server error",
  };

  return locale === "pl" ? pl : en;
}

function useNewsletterForm(locale: string) {
  const [submitState, setSubmitState] = useState<SubmitState>({
    type: "idle",
  });

  const handleSubmit = async (data: NewsletterFormData) => {
    setSubmitState({ type: "sending", email: data.email });

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, locale }),
      });
      const result = (await response.json().catch(() => null)) as
        | { status?: "success" | "already_subscribed" | "error" }
        | null;

      if (result?.status === "success") {
        setSubmitState({ type: "success", email: data.email });
      } else if (result?.status === "already_subscribed") {
        setSubmitState({ type: "already_subscribed", email: data.email });
      } else {
        setSubmitState({ type: "error", email: data.email, reason: "server" });
      }
    } catch {
      setSubmitState({ type: "error", email: data.email, reason: "network" });
    }
  };

  return { submitState, setSubmitState, handleSubmit };
}

function ChatStatusIndicator({ locale, state }: { locale: string; state: SubmitState }) {
  const t = strings(locale);

  if (state.type === "sending") {
    return <span className="animate-pulse">{t.chatSending}</span>;
  }
  if (state.type === "success" || state.type === "already_subscribed") {
    return <span>{t.chatRead}</span>;
  }
  if (state.type === "error") {
    return (
      <span>
        {state.reason === "network" ? t.chatFailedNetwork : t.chatFailedServer}
      </span>
    );
  }
  return null;
}

function InlineForm({ locale }: { locale: string }) {
  const t = strings(locale);
  const { submitState, handleSubmit } = useNewsletterForm(locale);

  const [email, setEmail] = useState<string>("");

  if (
    submitState.type === "success" ||
    submitState.type === "already_subscribed"
  ) {
    return (
      <div className="flex items-center gap-2 py-2 text-sm">
        <CheckCircle2 className="size-5 shrink-0 text-green-600 dark:text-green-500" />
        <span>
          {submitState.type === "success"
            ? t.successMessage
            : t.alreadySubscribed}
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
        const parsed = newsletterSchema.safeParse({ email });
        if (!parsed.success) return;
        void handleSubmit({ email: parsed.data.email });
      }}
    >
      <Input
        aria-label={t.emailPlaceholder}
        className="rounded-full border-0"
        disabled={isSubmitting}
        placeholder={t.emailPlaceholder}
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Button
        className="group shrink-0 py-1 pr-1"
        disabled={isSubmitting || !isValid}
        type="submit"
      >
        {t.subscribe}
        <span className="rounded-full bg-background p-1">
          {isSubmitting ? (
            <Spinner className="size-5 text-foreground" />
          ) : (
            <ArrowRight className="size-5 -rotate-45 text-foreground transition-transform group-hover:rotate-0" />
          )}
        </span>
      </Button>
    </form>
  );
}

function ChatForm({ locale }: { locale: string }) {
  const t = strings(locale);
  const { submitState, setSubmitState, handleSubmit } = useNewsletterForm(locale);
  const [email, setEmail] = useState<string>("");

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
            <ChatStatusIndicator locale={locale} state={submitState} />
          </div>
        </div>
      )}

      {(submitState.type === "success" ||
        submitState.type === "already_subscribed") && (
        <div className="px-4 pb-3">
          <div className="w-fit max-w-[80%] animate-[fadeSlideIn_0.4s_ease-out_0.6s_both] rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5 text-sm">
            {submitState.type === "success"
              ? t.successMessage
              : t.alreadySubscribed}
          </div>
        </div>
      )}

      {showInput && (
        <form
          className="flex items-center gap-2 border-t px-4 py-3"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const parsed = newsletterSchema.safeParse({ email });
            if (!parsed.success) return;
            void handleSubmit({ email: parsed.data.email });
          }}
        >
          <input
            aria-label={t.emailPlaceholder}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder={t.emailPlaceholder}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={
              submitState.type === "error"
                ? () => setSubmitState({ type: "idle" })
                : undefined
            }
          />
          <button
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-opacity hover:opacity-80"
            type="submit"
            disabled={submitState.type === "sending"}
          >
            <ArrowRight className="size-4" />
          </button>
        </form>
      )}
    </div>
  );
}

export function NewsletterForm({ locale, variant = "chat" }: NewsletterFormProps) {
  if (variant === "inline") {
    return <InlineForm locale={locale} />;
  }
  return <ChatForm locale={locale} />;
}
