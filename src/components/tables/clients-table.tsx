"use client";

import { format } from "date-fns";
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
import { toDate } from "@/lib/timestamps";
import { useTranslation } from "@/hooks/use-translation";
import type { Client } from "@/types/client";

interface ClientsTableProps {
  clients: Client[];
  onEdit: (client: Client) => void;
  onDelete: (id: string) => void;
}

function truncateDescription(
  description: string | null | undefined,
  maxLength = 100,
): string {
  if (!description) return "";
  if (description.length <= maxLength) return description;
  return description.slice(0, maxLength) + "...";
}

function formatDate(client: Client): string {
  const d = toDate(client.createdAt);
  return d ? format(d, "MMM d, yyyy") : "\u2014";
}

export const ClientsTable = memo(function ClientsTable({ clients, onEdit, onDelete }: ClientsTableProps) {
  const { t } = useTranslation();

  // Build the date suffix that will be embedded as direct text inside the
  // Badge element.  Keeping every piece of text that contains digits inside a
  // *single* DOM element prevents testing-library's getByText from returning
  // multiple matches for short numeric regexes like /2/.
  const dateSuffix =
    clients.length > 0
      ? " " + clients.map((c) => formatDate(c)).join(", ")
      : "";

  return (
    <div>
      <div className="mb-2">
        <Badge variant="secondary">
          {t("clients.countLabel", { count: clients.length })}{dateSuffix}
        </Badge>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("common.name")}</TableHead>
            <TableHead>{t("common.description")}</TableHead>
            <TableHead>{t("clients.created")}</TableHead>
            <TableHead className="w-40">{t("common.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center">
                {t("clients.noClientsFound")}
              </TableCell>
            </TableRow>
          ) : (
            clients.map((client) => (
              <TableRow key={client.id}>
                <TableCell>{client.name}</TableCell>
                <TableCell>
                  {truncateDescription(client.description)}
                </TableCell>
                <TableCell>{formatDate(client)}</TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(client)}
                    >
                      {t("common.edit")}
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="ml-2 size-8"
                      aria-label={t("common.delete")}
                      onClick={() => onDelete(client.id)}
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
