"use client";

import { format } from "date-fns";
import { memo } from "react";
import type { Session } from "@/types/session";
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

interface SessionsTableProps {
  sessions: Session[];
  onEdit: (session: Session) => void;
  onDelete: (sessionId: string) => void;
}

export const SessionsTable = memo(function SessionsTable({
  sessions,
  onEdit,
  onDelete,
}: SessionsTableProps) {
  const { t } = useTranslation();

  if (sessions.length === 0) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("common.title")}</TableHead>
            <TableHead>{t("common.type")}</TableHead>
            <TableHead>{t("sessions.time")}</TableHead>
            <TableHead>{t("common.location")}</TableHead>
            <TableHead>{t("sessions.speaker")}</TableHead>
            <TableHead className="w-40">{t("common.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell colSpan={6}>{t("sessions.noSessionsFound")}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
  }

  return (
    <>
      <div className="mb-2 text-sm text-muted-foreground">
        {t("sessions.countLabel", { count: sessions.length })}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("common.title")}</TableHead>
            <TableHead>{t("common.type")}</TableHead>
            <TableHead>{t("sessions.time")}</TableHead>
            <TableHead>{t("common.location")}</TableHead>
            <TableHead>{t("sessions.speaker")}</TableHead>
            <TableHead className="w-40">{t("common.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((session) => {
            const startTime = toDate(session.startTime);
            const endTime = toDate(session.endTime);

            return (
              <TableRow key={session.id}>
                <TableCell>{session.title}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{session.type}</Badge>
                </TableCell>
                <TableCell>
                  {startTime ? format(startTime, "MMM d, h:mm a") : "\u2014"} &ndash;{" "}
                  {endTime ? format(endTime, "MMM d, h:mm a") : "\u2014"}
                </TableCell>
                <TableCell>{session.location ?? "-"}</TableCell>
                <TableCell>{session.speakerName ?? "-"}</TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(session)}
                    >
                      {t("common.edit")}
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="ml-2 size-8"
                      aria-label={t("common.delete")}
                      onClick={() => onDelete(session.id)}
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
    </>
  );
});
