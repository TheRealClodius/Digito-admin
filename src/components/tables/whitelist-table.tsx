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
import type { WhitelistEntry, WhitelistAccessTier } from "@/types/whitelist-entry";

interface WhitelistTableProps {
  entries: WhitelistEntry[];
  onEdit: (entry: WhitelistEntry) => void;
  onDelete: (id: string) => void;
}

const tierColorMap: Record<WhitelistAccessTier, string> = {
  regular: "bg-slate-100 text-slate-800",
  premium: "bg-blue-100 text-blue-800",
  vip: "bg-amber-100 text-amber-800",
  staff: "bg-emerald-100 text-emerald-800",
};

function formatDate(entry: WhitelistEntry): string {
  const d = toDate(entry.addedAt);
  return d ? format(d, "MMM d, yyyy") : "\u2014";
}

function entryCountLabel(count: number): string {
  if (count === 1) return "1 entry";
  return `${count} entries`;
}

export const WhitelistTable = memo(function WhitelistTable({ entries, onEdit, onDelete }: WhitelistTableProps) {
  return (
    <div>
      <div className="mb-2">
        <Badge variant="secondary">
          {entryCountLabel(entries.length)}
        </Badge>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Livello Accesso</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Locked Fields</TableHead>
            <TableHead>Added</TableHead>
            <TableHead className="w-40">Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center">
                Nessun elemento trovato
              </TableCell>
            </TableRow>
          ) : (
            entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>{entry.email}</TableCell>
                <TableCell>
                  <Badge className={tierColorMap[entry.accessTier]}>
                    {entry.accessTier}
                  </Badge>
                </TableCell>
                <TableCell>{entry.company ?? "-"}</TableCell>
                <TableCell>
                  {entry.lockedFields && entry.lockedFields.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {entry.lockedFields.map((field) => (
                        <Badge key={field} variant="outline" className="text-xs">
                          {field}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>{formatDate(entry)}</TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(entry)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="ml-2 size-8"
                      aria-label="Delete"
                      onClick={() => onDelete(entry.id)}
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
