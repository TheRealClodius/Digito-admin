import { format } from "date-fns";
import { memo } from "react";
import type { Happening } from "@/types/happening";
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
import { Trash2 } from "lucide-react";

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
    <TableHead className="w-40">Actions</TableHead>
  </TableRow>
);

export const HappeningsTable = memo(function HappeningsTable({
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
            const startTime = toDate(happening.startTime);
            const endTime = toDate(happening.endTime);

            return (
              <TableRow key={happening.id}>
                <TableCell>{happening.title}</TableCell>
                <TableCell>
                  <Badge>{happening.type}</Badge>
                </TableCell>
                <TableCell>
                  {startTime ? format(startTime, "MMM d, yyyy h:mm a") : "\u2014"} &ndash;{" "}
                  {endTime ? format(endTime, "h:mm a") : "\u2014"}
                </TableCell>
                <TableCell>{happening.location ?? "-"}</TableCell>
                <TableCell>{happening.hostName ?? "-"}</TableCell>
                <TableCell>{happening.isHighlighted ? "Yes" : "No"}</TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(happening)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="ml-2 size-8"
                      aria-label="Delete"
                      onClick={() => onDelete(happening.id)}
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
      <p className="mt-2 text-sm text-muted-foreground">
        {count} {count === 1 ? "happening" : "happenings"}
      </p>
    </div>
  );
});
