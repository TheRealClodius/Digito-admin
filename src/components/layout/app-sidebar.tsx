"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
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
  MessageSquareText,
  Settings,
  LogOut,
  ChevronsUp,
  ChevronsDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEventContext } from "@/hooks/use-event-context";
import { usePermissions } from "@/hooks/use-permissions";
import { useTranslation } from "@/hooks/use-translation";
import { ContextSelector } from "./context-selector";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { signOut } from "@/lib/auth";
import type { TranslationKey } from "@/i18n/types";

const allMainNav = [
  { labelKey: "nav.dashboard" as TranslationKey, href: "/", icon: LayoutDashboard, minRole: "superadmin" as const },
  { labelKey: "nav.clients" as TranslationKey, href: "/clients", icon: Building2, minRole: "superadmin" as const },
];

const ROLE_LEVEL = { superadmin: 3, clientAdmin: 2, eventAdmin: 1 } as const;

const allEventNav = [
  { labelKey: "nav.overview" as TranslationKey, href: "", icon: Calendar },
  { labelKey: "nav.stands" as TranslationKey, href: "/stands", icon: MapPin },
  { labelKey: "nav.sessions" as TranslationKey, href: "/sessions", icon: Mic2 },
  { labelKey: "nav.happenings" as TranslationKey, href: "/happenings", icon: Sparkles },
  { labelKey: "nav.participants" as TranslationKey, href: "/whitelist", icon: Users },
  { labelKey: "nav.posts" as TranslationKey, href: "/posts", icon: FileImage },
  { labelKey: "nav.feedback" as TranslationKey, href: "/feedback", icon: MessageSquareText, minRole: "superadmin" as const },
];

interface AppSidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function AppSidebar({ collapsed = false, onToggleCollapse }: AppSidebarProps) {
  const pathname = usePathname();
  const { selectedEventId, selectedEventName } = useEventContext();
  const { role } = usePermissions();
  const { t } = useTranslation();

  const roleLevel = role ? ROLE_LEVEL[role] : 0;

  // Filter main nav based on role
  const mainNav = useMemo(
    () => allMainNav.filter((item) => roleLevel >= ROLE_LEVEL[item.minRole]),
    [roleLevel]
  );

  // Filter event nav based on role (items without minRole are visible to all)
  const eventNav = useMemo(
    () => allEventNav.filter((item) => !item.minRole || roleLevel >= ROLE_LEVEL[item.minRole]),
    [roleLevel]
  );

  return (
    <aside
      className={cn(
        "flex w-64 flex-col overflow-hidden rounded-xl border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm transition-all duration-300 ease-in-out",
        collapsed ? "h-[calc(3.5rem+2px)]" : "h-[calc(100vh-1rem)]"
      )}
    >
      <div className="flex h-14 shrink-0 items-center px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Image src="/digito-logo.svg" alt="Digito" width={24} height={24} />
          <span>Digito Admin</span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto size-7 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={onToggleCollapse}
          aria-label={collapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")}
        >
          {collapsed ? (
            <ChevronsDown className="size-4" />
          ) : (
            <ChevronsUp className="size-4" />
          )}
        </Button>
      </div>

      <ScrollArea className="flex-1 px-3 py-0">
        <div className="flex flex-col py-2">
          {/* Main nav FIRST */}
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
                {t(item.labelKey)}
              </Link>
            ))}
          </nav>

          {/* Separator only if main nav has items */}
          {mainNav.length > 0 && <Separator className="my-3" />}

          {/* Context selector SECOND */}
          <div className="mb-3">
            <ContextSelector />
          </div>

          {/* Event nav THIRD (when event selected) */}
          {selectedEventId && (
            <>
              <Separator className="my-3" />
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {selectedEventName || t("nav.event")}
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
                      {t(item.labelKey)}
                    </Link>
                  );
                })}
              </nav>
            </>
          )}
        </div>
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
          {t("nav.settings")}
        </Link>
        <Button
          variant="ghost"
          className="justify-start gap-3 px-3 text-sm font-medium text-muted-foreground"
          onClick={() => signOut()}
        >
          <LogOut className="size-4" />
          {t("nav.signOut")}
        </Button>
      </div>
    </aside>
  );
}
