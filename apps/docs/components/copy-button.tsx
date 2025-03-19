"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";

async function copyToClipboardWithMeta(value: string) {
  await navigator.clipboard.writeText(value);
}

export interface CopyButtonProps {
  value: string;
  className?: string;
}

export function CopyButton({
  value,
  className,
}: CopyButtonProps): React.ReactNode {
  const [hasCopied, setHasCopied] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setHasCopied(false);
    }, 2000);
  }, [hasCopied]);

  return (
    // @ts-ignore
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "absolute top-1.5 right-1.5 z-20 p-0 w-8 h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-transparent",
        className
      )}
      onClick={() => {
        copyToClipboardWithMeta(value)
          .then(() => {
            setHasCopied(true);
          })
          .catch((e) => {
            // eslint-disable-next-line no-console -- intentional
            console.error(e);
          });
      }}
    >
      <span className="sr-only">Copy</span>
      {hasCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
    </Button>
  );
}
