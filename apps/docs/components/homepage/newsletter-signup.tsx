"use client";

import { NewsletterForm } from "@/components/homepage/newsletter-form";
import Link from "next/link";

export function NewsletterSignup() {
  return (
    <section className="p-8 lg:px-12 lg:py-12 bg-background">
      <div className="flex flex-col gap-2">
        <h3 className="font-bold text-3xl">Weekly AI</h3>
        <p className="text-muted-foreground">
          Jeden newsletter. Najważniejsze newsy z AI, raz w tygodniu.
        </p>
      </div>

      <div className="mt-6">
        <NewsletterForm locale="pl" variant="inline" />

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
