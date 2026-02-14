"use client";

import { format } from "date-fns";
import { memo } from "react";
import type { FeedbackEntry } from "@/types/feedback";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { useTranslation } from "@/hooks/use-translation";

interface FeedbackTableProps {
  entries: FeedbackEntry[];
}

export const FeedbackTable = memo(function FeedbackTable({
  entries,
}: FeedbackTableProps) {
  const { t } = useTranslation();

  if (entries.length === 0) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("feedback.user")}</TableHead>
            <TableHead>{t("feedback.company")}</TableHead>
            <TableHead>{t("feedback.feedback")}</TableHead>
            <TableHead>{t("feedback.date")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell colSpan={4}>{t("feedback.noFeedbackFound")}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
  }

  return (
    <>
      <div className="mb-2 text-sm text-muted-foreground">
        {t("feedback.countLabel", { count: entries.length })}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("feedback.user")}</TableHead>
            <TableHead>{t("feedback.company")}</TableHead>
            <TableHead>{t("feedback.feedback")}</TableHead>
            <TableHead>{t("feedback.date")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell>
                <div>
                  <div className="font-medium">{entry.userName}</div>
                  <div className="text-sm text-muted-foreground">
                    {entry.userEmail}
                  </div>
                </div>
              </TableCell>
              <TableCell>{entry.userCompany}</TableCell>
              <TableCell className="max-w-md">
                {entry.feedbackText}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {format(new Date(entry.timestamp), "MMM d, yyyy h:mm a")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
});
