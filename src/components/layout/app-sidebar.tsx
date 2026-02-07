"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Calendar,
  ShoppingBag,
  MapPin,
  Mic2,
  Sparkles,
  Users,
  FileImage,
  ListChecks,
  UserCircle,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEventContext } from "@/hooks/use-event-context";
import { ContextSelector } from "./context-selector";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { signOut } from "@/lib/auth";

const mainNav = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Clients", href: "/clients", icon: Building2 },
];

const eventNav = [
  { label: "Overview", href: "", icon: Calendar },
  { label: "Brands", href: "/brands", icon: ShoppingBag },
  { label: "Stands", href: "/stands", icon: MapPin },
  { label: "Sessions", href: "/sessions", icon: Mic2 },
  { label: "Happenings", href: "/happenings", icon: Sparkles },
  { label: "Participants", href: "/participants", icon: Users },
  { label: "Posts", href: "/posts", icon: FileImage },
  { label: "Whitelist", href: "/whitelist", icon: ListChecks },
  { label: "Users", href: "/users", icon: UserCircle },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { selectedEventId } = useEventContext();

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <LayoutDashboard className="size-5" />
          <span>Digito Admin</span>
        </Link>
      </div>

      <div className="px-3 py-3">
        <ContextSelector />
      </div>

      <Separator />

      <ScrollArea className="flex-1 px-3 py-2">
        <nav className="flex flex-col gap-1">
          {mainNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                pathname === item.href &&
                  "bg-sidebar-accent text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        {selectedEventId && (
          <>
            <Separator className="my-3" />
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Event
            </p>
            <nav className="flex flex-col gap-1">
              {eventNav.map((item) => {
                const href = `/events/${selectedEventId}${item.href}`;
                const isActive =
                  item.href === ""
                    ? pathname === href
                    : pathname.startsWith(href);
                return (
                  <Link
                    key={item.href}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      isActive &&
                        "bg-sidebar-accent text-sidebar-accent-foreground"
                    )}
                  >
                    <item.icon className="size-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </>
        )}
      </ScrollArea>

      <Separator />

      <div className="flex flex-col gap-1 p-3">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            pathname === "/settings" &&
              "bg-sidebar-accent text-sidebar-accent-foreground"
          )}
        >
          <Settings className="size-4" />
          Settings
        </Link>
        <Button
          variant="ghost"
          className="justify-start gap-3 px-3 text-sm font-medium text-muted-foreground"
          onClick={() => signOut()}
        >
          <LogOut className="size-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
