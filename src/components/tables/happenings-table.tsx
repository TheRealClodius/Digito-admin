"use client";

import { format } from "date-fns";
import { memo } from "react";
import type { Happening } from "@/types/happening";
import { toDate } from "@/lib/timestamps";
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
import { Trash2 } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";

interface HappeningsTableProps {
  happenings: Happening[];
  onEdit: (happening: Happening) => void;
  onDelete: (happeningId: string) => void;
}

export const HappeningsTable = memo(function HappeningsTable({
  happenings,
  onEdit,
  onDelete,
}: HappeningsTableProps) {
  const { t } = useTranslation();

  const headers = (
    <TableRow>
      <TableHead>{t("common.title")}</TableHead>
      <TableHead>{t("common.type")}</TableHead>
      <TableHead>{t("happenings.time")}</TableHead>
      <TableHead>{t("common.location")}</TableHead>
      <TableHead>{t("happenings.host")}</TableHead>
      <TableHead>{t("common.highlighted")}</TableHead>
      <TableHead className="w-40">{t("common.actions")}</TableHead>
    </TableRow>
  );

  if (happenings.length === 0) {
    return (
      <Table>
        <TableHeader>{headers}</TableHeader>
        <TableBody>
          <TableRow>
            <TableCell colSpan={7}>{t("happenings.noHappeningsFound")}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>{headers}</TableHeader>
        <TableBody>
          {happenings.map((happening) => {
            const startTime = toDate(happening.startTime);
            const endTime = toDate(happening.endTime);

            return (
              <TableRow key={happening.id}>
                <TableCell>{happening.title}</TableCell>
                <TableCell>
                  <Badge>{happening.type}</Badge>
                </TableCell>
                <TableCell>
                  {startTime ? format(startTime, "MMM d, yyyy h:mm a") : "\u2014"} &ndash;{" "}
                  {endTime ? format(endTime, "h:mm a") : "\u2014"}
                </TableCell>
                <TableCell>{happening.location ?? "-"}</TableCell>
                <TableCell>{happening.hostName ?? "-"}</TableCell>
                <TableCell>{happening.isHighlighted ? t("common.yes") : t("common.no")}</TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(happening)}
                    >
                      {t("common.edit")}
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="ml-2 size-8"
                      aria-label={t("common.delete")}
                      onClick={() => onDelete(happening.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("happenings.countLabel", { count: happenings.length })}
      </p>
    </div>
  );
});
