"use client";

import type { Participant } from "@/types/participant";
import { memo } from "react";
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

interface ParticipantsTableProps {
  participants: Participant[];
  onEdit: (participant: Participant) => void;
  onDelete: (id: string) => void;
}

export const ParticipantsTable = memo(function ParticipantsTable({
  participants,
  onEdit,
  onDelete,
}: ParticipantsTableProps) {
  const { t } = useTranslation();

  return (
    <div>
      <div className="mb-2">
        <Badge variant="secondary">
          {t("participants.countLabel", { count: participants.length })}
        </Badge>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("common.name")}</TableHead>
            <TableHead>{t("participants.role")}</TableHead>
            <TableHead>{t("common.company")}</TableHead>
            <TableHead>{t("common.email")}</TableHead>
            <TableHead>{t("participants.accessTier")}</TableHead>
            <TableHead>{t("common.highlighted")}</TableHead>
            <TableHead className="w-40">{t("common.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {participants.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center">
                {t("participants.noParticipantsFound")}
              </TableCell>
            </TableRow>
          ) : (
            participants.map((participant) => (
              <TableRow key={participant.id}>
                <TableCell>
                  {participant.firstName} {participant.lastName}
                </TableCell>
                <TableCell>
                  <Badge>{participant.role}</Badge>
                </TableCell>
                <TableCell>{participant.company ?? ""}</TableCell>
                <TableCell>{participant.email ?? ""}</TableCell>
                <TableCell>
                  <Badge>{participant.accessTier}</Badge>
                </TableCell>
                <TableCell>{participant.isHighlighted ? t("common.yes") : t("common.no")}</TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(participant)}
                    >
                      {t("common.edit")}
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="ml-2 size-8"
                      aria-label={t("common.delete")}
                      onClick={() => onDelete(participant.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
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
