"use client";

import { format } from "date-fns";
import { memo } from "react";
import type { Event } from "@/types/event";
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
import { Switch } from "@/components/ui/switch";
import { Trash2 } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";

interface EventsTableProps {
  events: Event[];
  onEdit: (event: Event) => void;
  onDelete: (eventId: string) => void;
  onToggleActive: (eventId: string, newValue: boolean) => void;
}

function getStatusKey(startDate: Date, endDate: Date): "events.statusUpcoming" | "events.statusEnded" | "events.statusOngoing" {
  const now = new Date();
  if (now < startDate) return "events.statusUpcoming";
  if (now > endDate) return "events.statusEnded";
  return "events.statusOngoing";
}

export const EventsTable = memo(function EventsTable({
  events,
  onEdit,
  onDelete,
  onToggleActive,
}: EventsTableProps) {
  const { t } = useTranslation();

  if (events.length === 0) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("common.name")}</TableHead>
            <TableHead>{t("events.venue")}</TableHead>
            <TableHead>{t("events.date")}</TableHead>
            <TableHead>{t("events.status")}</TableHead>
            <TableHead>{t("common.active")}</TableHead>
            <TableHead className="w-40">{t("common.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell colSpan={6}>{t("events.noEventsFound")}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("common.name")}</TableHead>
          <TableHead>{t("events.venue")}</TableHead>
          <TableHead>{t("events.date")}</TableHead>
          <TableHead>{t("events.status")}</TableHead>
          <TableHead>{t("common.active")}</TableHead>
          <TableHead className="w-40">{t("common.actions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.map((event) => {
          const startDate = toDate(event.startDate);
          const endDate = toDate(event.endDate);
          const statusKey = startDate && endDate ? getStatusKey(startDate, endDate) : null;
          const status = statusKey ? t(statusKey) : "Unknown";

          return (
            <TableRow key={event.id}>
              <TableCell>{event.name}</TableCell>
              <TableCell>{event.venue ?? "-"}</TableCell>
              <TableCell>
                {startDate ? format(startDate, "MMM d, yyyy") : "\u2014"} &ndash;{" "}
                {endDate ? format(endDate, "MMM d, yyyy") : "\u2014"}
              </TableCell>
              <TableCell>
                <Badge>{status}</Badge>
              </TableCell>
              <TableCell>
                <Switch
                  checked={event.isActive}
                  onCheckedChange={() =>
                    onToggleActive(event.id, !event.isActive)
                  }
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(event)}
                  >
                    {t("common.edit")}
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="ml-2 size-8"
                    aria-label={t("common.delete")}
                    onClick={() => onDelete(event.id)}
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
  );
});
