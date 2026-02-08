import { format } from "date-fns";
import type { Event } from "@/types/event";
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
  if (now < startDate) return "Upcoming";
  if (now > endDate) return "Ended";
  return "Live";
}

export function EventsTable({
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
            <TableHead>Name</TableHead>
            <TableHead>Venue</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Active</TableHead>
            <TableHead className="w-40">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell colSpan={6}>No events found</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Venue</TableHead>
          <TableHead>Dates</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Active</TableHead>
          <TableHead className="w-40">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.map((event) => {
          const toDate = (val: unknown): Date =>
            val && typeof (val as { toDate?: unknown }).toDate === "function"
              ? (val as { toDate: () => Date }).toDate()
              : new Date(val as string | number);
          const startDate = toDate(event.startDate);
          const endDate = toDate(event.endDate);
          const status = getStatus(startDate, endDate);

          return (
            <TableRow key={event.id}>
              <TableCell>{event.name}</TableCell>
              <TableCell>{event.venue ?? "-"}</TableCell>
              <TableCell>
                {format(startDate, "MMM d, yyyy")} &ndash;{" "}
                {format(endDate, "MMM d, yyyy")}
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
}
