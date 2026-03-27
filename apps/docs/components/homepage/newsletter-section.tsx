import { Button } from "@/components/ui/button";
import { ArrowRight, Bot } from "lucide-react";
import Link from "next/link";
import { NewsletterForm } from "./newsletter-form";

function copy() {
  // Source of truth (EN only): zanreal-labs/web → apps/marketing/messages/en.json (namespace: "newsletter")
  return {
    heroTitle: "Can't keep up with changes in AI world?",
    heroDescription:
      "Let us do the heavy lifting. Every week we distill the most important AI developments into a focused 5-minute briefing — so you stay ahead without the noise.",
    cta: "Find out more",
    sectionTitle: "Weekly AI",
    online: "online",
    // Chat messages (marketing has 4 items: 3 bubbles + link card)
    m1: "Curated AI news for your morning coffee. Every week.",
    m2: "Send me your email to sign up.",
    m3: "Find out more here:",
    cardTitle: "Weekly AI",
    cardDescription:
      "Subscribe to Weekly AI - a curated newsletter with the latest AI news, model releases, and industry trends. No spam, just the signal.",
    cardDomain: "zanreal.com",
  };
}

export function NewsletterSection() {
  const t = copy();

  return (
    <div className="-ml-px flex flex-col bg-background md:flex-row">
      {/* Left side — title & description */}
      <div className="flex flex-col gap-4 border-b p-6 md:w-1/2 md:border-r md:border-b-0 md:p-10">
        <Bot className="size-12" />
        <h2 className="text-balance font-bold text-2xl md:text-3xl">
          {t.heroTitle}
        </h2>
        <p className="text-balance text-muted-foreground text-sm leading-relaxed">
          {t.heroDescription}
        </p>
        <Button asChild className="w-fit" variant="outline">
          <Link
            href="https://zanreal.com/weekly-ai"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.cta}
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      {/* Right side — chat */}
      <div className="flex flex-col md:w-1/2">
        {/* Chat header */}
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <span className="size-2 rounded-full bg-green-500" />
          <span className="font-medium text-sm">{t.sectionTitle}</span>
          <span className="text-muted-foreground text-xs">{t.online}</span>
        </div>

        {/* Messages area */}
        <div className="flex flex-1 flex-col gap-0.5 p-4">
          <div className="w-fit max-w-[85%]">
            <div className="rounded-2xl rounded-br-2xl rounded-bl-sm bg-muted px-4 py-2.5 text-sm">
              {t.m1}
            </div>
          </div>
          <div className="w-fit max-w-[85%]">
            <div className="rounded-sm rounded-tr-2xl rounded-br-2xl bg-muted px-4 py-2.5 text-sm">
              {t.m2}
            </div>
          </div>
          <div className="w-fit max-w-[85%]">
            <div className="rounded-sm rounded-tr-2xl rounded-br-2xl bg-muted px-4 py-2.5 text-sm">
              {t.m3}
            </div>
          </div>

          {/* Link card (4th item, to match marketing) */}
          <div className="flex max-w-[85%] flex-col gap-1.5">
            <Link
              className="group flex w-56 flex-col overflow-hidden rounded-xl border transition-colors hover:bg-muted/50"
              href="https://zanreal.com/weekly-ai"
              target="_blank"
              rel="noopener noreferrer"
            >
              {/* biome-ignore lint: stable OG image URL with encrypted query string */}
              <img
                alt={t.cardTitle}
                className="aspect-1200/630 w-full object-cover"
                height={630}
                width={1200}
                src="https://zanreal.com/api/og?data=ZWiMS2nnf4tn8U3ipDLTm1fItCSb6HN5zxwNPIBf7FGMg-I7M3pllNHHj0bAWvf6BNJr7Q8N1ZA6Mnf_O1HJbgo4DUvoKkjsgkF_WZPyr_cgDMD1hsilSLudnwF_V6R4VpXMell1ZHdjE113FceBVs5tYnhPPpy9ZTMMZeVfiE_wAuecXSb5QNMyqidSvRNzjIebQAeU7KWNOjblakhstOlYiO8xG1fopKGnScY5P_-pbfb0WKoD_-VqsKnTbvDTgWkdnNnuec8Rw_-PnRrerXIohat36cvRm-E"
              />
              <div className="flex flex-col gap-0.5 border-t px-3 py-2">
                <span className="font-medium text-xs">{t.cardTitle}</span>
                <span className="line-clamp-1 text-muted-foreground text-xs">
                  {t.cardDescription}
                </span>
                <span className="flex items-center gap-1 text-muted-foreground/60 text-xs">
                  {t.cardDomain}
                  <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          </div>
        </div>

        {/* Chat input */}
        <NewsletterForm locale="en" variant="chat" />
      </div>
    </div>
  );
}
