"use client";

import Link from "next/link";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";

export default function UnauthorizedPage() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <ShieldX className="size-16 text-destructive" />
      <h1 className="text-2xl font-bold">{t("unauthorized.title")}</h1>
      <p className="text-muted-foreground">
        {t("unauthorized.description")}
      </p>
      <Button asChild variant="outline">
        <Link href="/login">{t("unauthorized.backToLogin")}</Link>
      </Button>
    </div>
  );
}
