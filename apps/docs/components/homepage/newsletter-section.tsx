import { ArrowRight, Bot } from "lucide-react";
import Link from "next/link";
import { NewsletterForm } from "./newsletter-form";

export function NewsletterSection({ locale }: { locale: string }) {
  return (
    <div className="-ml-px flex flex-col md:flex-row">
      {/* Left side — title & description */}
      <div className="flex flex-col gap-4 border-b p-6 md:w-1/2 md:border-r md:border-b-0 md:p-10">
        <Bot className="size-12" />
        <h2 className="text-balance font-bold text-2xl md:text-3xl">
          Weekly AI
        </h2>
        <p className="text-balance text-muted-foreground text-sm leading-relaxed">
          Krótko, konkretnie, raz w tygodniu. Najważniejsze newsy i zmiany w świecie AI.
        </p>
        <Link
          className="inline-flex w-fit items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
          href="https://zanreal.com/weekly-ai"
          target="_blank"
          rel="noopener noreferrer"
        >
          Zobacz archiwum
          <ArrowRight className="size-4" />
        </Link>
      </div>

      {/* Right side — chat */}
      <div className="flex flex-col md:w-1/2">
        {/* Chat header */}
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <span className="size-2 rounded-full bg-green-500" />
          <span className="font-medium text-sm">Weekly AI</span>
          <span className="text-muted-foreground text-xs">online</span>
        </div>

        {/* Messages area */}
        <div className="flex flex-1 flex-col gap-0.5 p-4">
          <div className="w-fit max-w-[85%]">
            <div className="rounded-2xl rounded-br-2xl rounded-bl-sm bg-muted px-4 py-2.5 text-sm">
              Wpisz e-mail i potwierdź subskrypcję w wiadomości.
            </div>
          </div>
          <div className="w-fit max-w-[85%]">
            <div className="rounded-sm rounded-tr-2xl rounded-br-2xl bg-muted px-4 py-2.5 text-sm">
              Zero spamu. Możesz wypisać się w każdej chwili.
            </div>
          </div>
        </div>

        {/* Chat input */}
        <NewsletterForm locale={locale} variant="chat" />
      </div>
    </div>
  );
}
