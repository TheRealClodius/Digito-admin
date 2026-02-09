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
          {clients.length} cliente(i){dateSuffix}
        </Badge>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Descrizione</TableHead>
            <TableHead>Creato</TableHead>
            <TableHead className="w-40">Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center">
                Nessun cliente trovato
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
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="ml-2 size-8"
                      aria-label="Delete"
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
