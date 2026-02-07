import { format } from "date-fns";
import type { Happening } from "@/types/happening";
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

interface HappeningsTableProps {
  happenings: Happening[];
  onEdit: (happening: Happening) => void;
  onDelete: (happeningId: string) => void;
}

const headers = (
  <TableRow>
    <TableHead>Title</TableHead>
    <TableHead>Type</TableHead>
    <TableHead>Time</TableHead>
    <TableHead>Location</TableHead>
    <TableHead>Host</TableHead>
    <TableHead>Highlighted</TableHead>
    <TableHead>Actions</TableHead>
  </TableRow>
);

export function HappeningsTable({
  happenings,
  onEdit,
  onDelete,
}: HappeningsTableProps) {
  if (happenings.length === 0) {
    return (
      <Table>
        <TableHeader>{headers}</TableHeader>
        <TableBody>
          <TableRow>
            <TableCell colSpan={7}>No happenings found</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
  }

  const count = happenings.length;

  return (
    <div>
      <Table>
        <TableHeader>{headers}</TableHeader>
        <TableBody>
          {happenings.map((happening) => {
            const startTime = happening.startTime.toDate();
            const endTime = happening.endTime.toDate();

            return (
              <TableRow key={happening.id}>
                <TableCell>{happening.title}</TableCell>
                <TableCell>
                  <Badge>{happening.type}</Badge>
                </TableCell>
                <TableCell>
                  {format(startTime, "MMM d, yyyy h:mm a")} &ndash;{" "}
                  {format(endTime, "h:mm a")}
                </TableCell>
                <TableCell>{happening.location ?? "-"}</TableCell>
                <TableCell>{happening.hostName ?? "-"}</TableCell>
                <TableCell>{happening.isHighlighted ? "Yes" : "No"}</TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(happening)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onDelete(happening.id)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <p className="mt-2 text-sm text-muted-foreground">
        {count} {count === 1 ? "happening" : "happenings"}
      </p>
    </div>
  );
}
