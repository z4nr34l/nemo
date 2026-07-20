import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "../ui/button";

export function OssProgram() {
  return (
    <Link href="/docs/2.0/stewardship" className="cursor-pointer">
      <div className="bg-black text-white flex flex-col md:flex-row items-start md:items-center justify-between py-2 px-6 border-b">
        <div className="flex items-center gap-3">
          <Image
            src="https://cdn.zanreal.com/public/logo.svg"
            className="h-4 w-auto"
            alt="ZANREAL logo"
            width={16}
            height={16}
          />
          <p>Maintained by ZanReal as part of its OSS Program</p>
        </div>

        {/*
          The whole banner is already the link. `asChild` renders this as a <span> so we keep the
          button styling without nesting a <button> inside the <a>, which is invalid markup and
          gives the banner two competing interactive targets.
        */}
        <Button asChild variant="link" size="sm" className="p-0 text-white">
          <span>
            What that means <ArrowRight className="size-4" />
          </span>
        </Button>
      </div>
    </Link>
  );
}
