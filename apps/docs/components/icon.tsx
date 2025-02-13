import type { LucideIcon } from "lucide-react";
import { TerminalIcon } from "lucide-react";
import { ReactElement } from "react";

export function create({ icon: Icon }: { icon?: LucideIcon }): ReactElement {
  return (
    <div className="rounded-md border bg-gradient-to-b from-fd-secondary p-1 shadow-sm">
      {Icon ? <Icon /> : <TerminalIcon />}
    </div>
  );
}
