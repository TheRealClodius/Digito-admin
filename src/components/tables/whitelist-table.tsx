"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { memo } from "react";
import { Trash2 } from "lucide-react";

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toDate } from "@/lib/timestamps";
import { useTranslation } from "@/hooks/use-translation";
import type { WhitelistEntry, WhitelistAccessTier } from "@/types/whitelist-entry";

export interface EventUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isActive: boolean;
}

interface WhitelistTableProps {
  entries: WhitelistEntry[];
  users?: EventUser[];
  onEdit: (entry: WhitelistEntry) => void;
  onDelete: (id: string) => void;
}

const tierColorMap: Record<WhitelistAccessTier, string> = {
  regular: "bg-slate-100 text-slate-800",
  premium: "bg-blue-100 text-blue-800",
  vip: "bg-amber-100 text-amber-800",
  staff: "bg-emerald-100 text-emerald-800",
};

interface MergedRow {
  key: string;
  email: string;
  name: string;
  accessTier: WhitelistAccessTier;
  company: string | null;
  lockedFields: string[];
  addedAt: string;
  isActive: boolean;
  whitelistEntry: WhitelistEntry | null;
}

function formatTimestamp(entry: WhitelistEntry): string {
  const d = toDate(entry.addedAt);
  return d ? format(d, "MMM d, yyyy") : "\u2014";
}

export const WhitelistTable = memo(function WhitelistTable({
  entries,
  users = [],
  onEdit,
  onDelete,
}: WhitelistTableProps) {
  const { t } = useTranslation();

  const mergedRows = useMemo<MergedRow[]>(() => {
    const userByEmail = new Map(users.map((u) => [u.email, u]));
    const seenEmails = new Set<string>();

    const rows: MergedRow[] = entries.map((entry) => {
      seenEmails.add(entry.email);
      const user = userByEmail.get(entry.email) ?? null;
      return {
        key: `wl-${entry.id}`,
        email: entry.email,
        name: user
          ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "\u2014"
          : "\u2014",
        accessTier: entry.accessTier,
        company: entry.company ?? null,
        lockedFields: entry.lockedFields ?? [],
        addedAt: formatTimestamp(entry),
        isActive: user ? user.isActive : true,
        whitelistEntry: entry,
      };
    });

    for (const user of users) {
      if (!seenEmails.has(user.email)) {
        rows.push({
          key: `u-${user.id}`,
          email: user.email,
          name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "\u2014",
          accessTier: "regular",
          company: null,
          lockedFields: [],
          addedAt: "\u2014",
          isActive: user.isActive,
          whitelistEntry: null,
        });
      }
    }

    return rows;
  }, [entries, users]);

  function entryCountLabel(count: number): string {
    if (count === 1) return t("whitelist.countLabelSingular");
    return t("whitelist.countLabelPlural", { count });
  }

  return (
    <div>
      <div className="mb-2">
        <Badge variant="secondary">
          {entryCountLabel(mergedRows.length)}
        </Badge>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("common.email")}</TableHead>
            <TableHead>{t("common.name")}</TableHead>
            <TableHead>{t("whitelist.accessTier")}</TableHead>
            <TableHead>{t("common.company")}</TableHead>
            <TableHead>{t("common.status")}</TableHead>
            <TableHead>{t("whitelist.added")}</TableHead>
            <TableHead className="w-40">{t("common.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mergedRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center">
                {t("whitelist.noEntriesFound")}
              </TableCell>
            </TableRow>
          ) : (
            mergedRows.map((row) => (
              <TableRow key={row.key}>
                <TableCell>{row.email}</TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell>
                  <Badge className={tierColorMap[row.accessTier]}>
                    {row.accessTier}
                  </Badge>
                </TableCell>
                <TableCell>{row.company ?? "-"}</TableCell>
                <TableCell>
                  {row.isActive ? (
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-800">Deactivated</Badge>
                  )}
                </TableCell>
                <TableCell>{row.addedAt}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {row.whitelistEntry && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEdit(row.whitelistEntry!)}
                        >
                          {t("common.edit")}
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="size-8"
                          aria-label={t("common.delete")}
                          onClick={() => onDelete(row.whitelistEntry!.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
});
