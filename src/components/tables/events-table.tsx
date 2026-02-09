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

interface EventsTableProps {
  events: Event[];
  onEdit: (event: Event) => void;
  onDelete: (eventId: string) => void;
  onToggleActive: (eventId: string, newValue: boolean) => void;
}

function getStatus(startDate: Date, endDate: Date): string {
  const now = new Date();
  if (now < startDate) return "Prossimo";
  if (now > endDate) return "Terminato";
  return "In Corso";
}

export const EventsTable = memo(function EventsTable({
  events,
  onEdit,
  onDelete,
  onToggleActive,
}: EventsTableProps) {
  if (events.length === 0) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Sede</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Stato</TableHead>
            <TableHead>Attivo</TableHead>
            <TableHead className="w-40">Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell colSpan={6}>Nessun evento trovato</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Sede</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Stato</TableHead>
          <TableHead>Attivo</TableHead>
          <TableHead className="w-40">Azioni</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.map((event) => {
          const startDate = toDate(event.startDate);
          const endDate = toDate(event.endDate);
          const status = startDate && endDate ? getStatus(startDate, endDate) : "Unknown";

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
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="ml-2 size-8"
                    aria-label="Delete"
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
