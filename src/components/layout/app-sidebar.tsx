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
    <aside className="flex h-screen w-60 flex-col border-r border-border/60 bg-sidebar text-sidebar-foreground">
      <div className="flex h-12 items-center px-4">
        <Link href="/" className="flex items-center gap-2 text-sm font-medium">
          <LayoutDashboard className="size-4 text-muted-foreground" />
          <span>Digito Admin</span>
        </Link>
      </div>

      <div className="px-2 pb-2">
        <ContextSelector />
      </div>

      <Separator className="opacity-60" />

      <ScrollArea className="flex-1 px-2 py-2">
        <nav className="flex flex-col gap-0.5">
          {mainNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-sm px-2 py-1.5 text-sm transition-colors duration-100 hover:bg-sidebar-accent",
                pathname === item.href
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        {selectedEventId && (
          <>
            <Separator className="my-2 opacity-60" />
            <p className="mb-1 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Event
            </p>
            <nav className="flex flex-col gap-0.5">
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
                      "flex items-center gap-2.5 rounded-sm px-2 py-1.5 text-sm transition-colors duration-100 hover:bg-sidebar-accent",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-muted-foreground"
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

      <Separator className="opacity-60" />

      <div className="flex flex-col gap-0.5 p-2">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-2.5 rounded-sm px-2 py-1.5 text-sm transition-colors duration-100 hover:bg-sidebar-accent",
            pathname === "/settings"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-muted-foreground"
          )}
        >
          <Settings className="size-4" />
          Settings
        </Link>
        <Button
          variant="ghost"
          className="h-auto justify-start gap-2.5 rounded-sm px-2 py-1.5 text-sm font-normal text-muted-foreground"
          onClick={() => signOut()}
        >
          <LogOut className="size-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
