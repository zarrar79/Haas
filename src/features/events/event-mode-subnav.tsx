"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { StickyToolbar } from "@/components/ui/sticky-toolbar";
import type { ModeSubnavItem } from "@/features/events/event-mode-subnav-items";

export type { ModeSubnavItem };
export {
  adSubnavItems,
  ctfSubnavItems,
  kothSubnavItems,
} from "@/features/events/event-mode-subnav-items";

type Props = {
  items: ModeSubnavItem[];
};

export function EventModeSubnav({ items }: Props) {
  const pathname = usePathname();

  return (
    <StickyToolbar>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const isModeRoot = /\/(ctf|koth|ad)$/.test(item.href);
          const active = isModeRoot
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link key={item.id} href={item.href}>
              <Button size="sm" variant={active ? "primary" : "secondary"}>
                {item.label}
              </Button>
            </Link>
          );
        })}
      </div>
    </StickyToolbar>
  );
}
