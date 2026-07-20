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

        <Button variant="link" size="sm" className="p-0 text-white">
          What that means <ArrowRight className="size-4" />
        </Button>
      </div>
    </Link>
  );
}
