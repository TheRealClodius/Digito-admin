import { format } from "date-fns";

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
  return format(client.createdAt.toDate(), "MMM d, yyyy");
}

export function ClientsTable({ clients, onEdit, onDelete }: ClientsTableProps) {
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
          {clients.length} client(s){dateSuffix}
        </Badge>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center">
                No clients found
              </TableCell>
            </TableRow>
          ) : (
            clients.map((client) => (
              <TableRow key={client.id}>
                <TableCell>{client.name}</TableCell>
                <TableCell>
                  {truncateDescription(client.description)}
                </TableCell>
                <TableCell
                  title={formatDate(client)}
                />
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(client)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="ml-2"
                    onClick={() => onDelete(client.id)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
