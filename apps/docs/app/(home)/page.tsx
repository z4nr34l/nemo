import { Comparizon } from "@/components/homepage/comparizon";
import { Hero } from "@/components/homepage/hero";
import { NewsletterSection } from "@/components/homepage/newsletter-section";
import { VercelOssProgram } from "@/components/homepage/vercel-oss-program";
import { Button } from "@/components/ui/button";
import { Activity, Check, Github, Globe, Link2, PackageOpen } from "lucide-react";
import Link from "next/link";
import { ReactElement } from "react";

export default function HomePage(): ReactElement {
  return (
    <main className="px-4 xl:px-0 py-[150px] bg-background">
      <div className="relative max-w-5xl mx-auto border divide-y">
        <Hero />

        <VercelOssProgram />

        <Comparizon />

        <div className="grid lg:grid-cols-3 bg-border gap-px">
          <div className="p-8 lg:px-10 lg:py-14 bg-background flex flex-col items-start justify-start gap-6 lg:border-r">
            <h2 className="text-4xl font-bold text-muted-foreground">
              <span className="text-foreground">Simplify</span> your middlewares{" "}
              <span className="text-foreground">now</span>!
            </h2>
            <Button className="rounded-full border" asChild>
              <Link href="/docs">Get started</Link>
            </Button>
          </div>

          <div className="p-8 lg:px-8 lg:py-12 bg-background flex flex-col items-start justify-start gap-6 lg:border-r">
            <h2 className="text-3xl font-bold text-muted-foreground">
              Supports
            </h2>

            <div className="flex items-center justify-start gap-6">
              <Activity className="size-6 min-w-6 text-muted-foreground" />
              <div>
                <h3 className="text-xl font-medium">Dynamic segments</h3>
                <p className="text-muted-foreground text-sm">
                  Run your middleware for any route or dynamic segment
                </p>
              </div>
            </div>

            <div className="flex items-center justify-start gap-6">
              <Link2 className="size-6 min-w-6 text-muted-foreground" />
              <div>
                <h3 className="text-xl font-medium">Functions Chaining</h3>
                <p className="text-muted-foreground text-sm">
                  Chain multiple middlewares for single group
                </p>
              </div>
            </div>

            <div className="flex items-center justify-start gap-6">
              <Globe className="size-6 min-w-6 text-muted-foreground" />
              <div>
                <h3 className="text-xl font-medium">Shared context</h3>
                <p className="text-muted-foreground text-sm">
                  Functions can share context between each other
                </p>
              </div>
            </div>
          </div>

          <div className="p-8 lg:px-8 lg:py-12 bg-background flex flex-col items-start justify-start gap-6">
            <div className="flex items-center justify-start gap-6">
              <PackageOpen className="h-6 w-6 min-w-6 text-muted-foreground" />
              <div>
                <h3 className="text-xl font-medium">Open-source</h3>
                <p className="text-muted-foreground text-sm">
                  Something is missing? Just add it or post an issue on GitHub
                </p>
              </div>
            </div>

            <div className="flex items-center justify-start gap-6">
              <Link2 className="size-6 min-w-6 text-muted-foreground" />
              <div>
                <h3 className="text-xl font-medium">Developer Experience</h3>
                <p className="text-muted-foreground text-sm">
                  Developers are most important to me, this package will be as
                  easy and useful as possible
                </p>
              </div>
            </div>
          </div>
        </div>

          <div className="h-6 bg-background border-t" />

          <div className="p-8 lg:px-12 lg:py-12 bg-background flex flex-col md:flex-row items-start md:items-center justify-start gap-6 border-t">
            <div className="flex flex-col flex-1 gap-2">
              <h3 className="font-bold text-3xl">
                Need implementation or enterprise support?
              </h3>
              <p className="text-muted-foreground max-w-[75vw] text-balance">
                If you&apos;re having issues with deployment, need NBD (Next Business Day) or 24h enterprise SLA, we&apos;re ready to help!
              </p>
            </div>
            <Button
              size="lg"
              className="rounded-full flex items-center justify-center gap-x-4"
              asChild
            >
              <Link href="https://zanreal.com/contact?interest=software-development" target="_blank">
                Get Support
              </Link>
            </Button>
          </div>

          <div className="grid lg:grid-cols-3 bg-border gap-px border-t">
            <div className="p-8 lg:px-8 lg:py-12 bg-background flex flex-col items-start justify-start gap-6 lg:border-r">
              <div>
                <h3 className="text-2xl font-bold text-foreground">Community</h3>
                <p className="text-sm text-muted-foreground mt-1">Free</p>
              </div>
              <div className="flex flex-col gap-3 w-full">
                <div className="flex items-start gap-3">
                  <Check className="size-5 min-w-5 text-foreground mt-0.5" />
                  <p className="text-sm text-muted-foreground">Support on GitHub</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="size-5 min-w-5 text-foreground mt-0.5" />
                  <p className="text-sm text-muted-foreground">Community-driven help</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="size-5 min-w-5 text-foreground mt-0.5" />
                  <p className="text-sm text-muted-foreground">No SLA guarantee</p>
                </div>
              </div>
            </div>

            <div className="p-8 lg:px-8 lg:py-12 bg-muted flex flex-col items-start justify-start gap-6 lg:border-r relative">
              <div className="bg-brand text-white text-xs font-semibold px-3 py-1 absolute top-0 left-0 w-full font-mono uppercase">
                Most Popular
              </div>
              <div>
                <h3 className="text-2xl font-bold text-foreground">Pro</h3>
                <p className="text-sm text-muted-foreground mt-1">$20/month</p>
              </div>
              <div className="flex flex-col gap-3 w-full">
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 min-w-5 text-foreground mt-0.5" />
                  <p className="text-sm text-muted-foreground">Email support</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 min-w-5 text-foreground mt-0.5" />
                  <p className="text-sm text-muted-foreground">3-5 business days response</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 min-w-5 text-foreground mt-0.5" />
                  <p className="text-sm text-muted-foreground">Priority handling</p>
                </div>
              </div>
            </div>

            <div className="p-8 lg:px-8 lg:py-12 bg-background flex flex-col items-start justify-start gap-6">
              <div>
                <h3 className="text-2xl font-bold text-foreground">Enterprise</h3>
                <p className="text-sm text-muted-foreground mt-1">From $200/month</p>
              </div>
              <div className="flex flex-col gap-3 w-full">
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 min-w-5 text-foreground mt-0.5" />
                  <p className="text-sm text-muted-foreground">24h response time SLA</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 min-w-5 text-foreground mt-0.5" />
                  <p className="text-sm text-muted-foreground">Dedicated communication channel</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 min-w-5 text-foreground mt-0.5" />
                  <p className="text-sm text-muted-foreground">Direct team access</p>
                </div>
              </div>
            </div>
          </div>

          <div className="h-6 bg-background" />

          <div className="grid bg-border gap-x-px">
           <div className="p-8 lg:px-12 lg:py-12 bg-background flex flex-col md:flex-row items-start md:items-center justify-start gap-6">
             <div className="flex flex-col flex-1 gap-2">
               <h3 className="font-bold text-3xl">
                 Want to help with this project?
               </h3>
               <p className="text-muted-foreground max-w-[75vw]">
                 Review existing issues, make an PR&apos;s with what&apos;s
                 missing!
               </p>
             </div>
             <Button
               variant="secondary"
               size="lg"
               className="rounded-full flex items-center justify-center gap-x-4 border"
               asChild
             >
               <Link href="https://github.com/z4nr34l/nemo" target="_blank">
                 <Github className="size-6" />
                 GitHub
               </Link>
             </Button>
           </div>
        </div>

        <div className="grid bg-background">
          <NewsletterSection />
        </div>
      </div>
      <div className="relative max-w-5xl mx-auto">
        <p className="text-muted-foreground text-xs text-right">
          Handcrafted by&nbsp;
          <Button variant="link" className="p-0" asChild>
            <Link href="https://zanreal.com" target="_blank">
              ZanReal
            </Link>
          </Button>
        </p>
      </div>
    </main>
  );
}
