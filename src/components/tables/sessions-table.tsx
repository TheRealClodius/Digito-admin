import { format } from "date-fns";
import { memo } from "react";
import type { Session } from "@/types/session";
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

interface SessionsTableProps {
  sessions: Session[];
  onEdit: (session: Session) => void;
  onDelete: (sessionId: string) => void;
}

export const SessionsTable = memo(function SessionsTable({
  sessions,
  onEdit,
  onDelete,
}: SessionsTableProps) {
  const sessionCount = sessions.length;
  const sessionLabel = sessionCount === 1 ? "session" : "sessions";

  if (sessions.length === 0) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Speaker</TableHead>
            <TableHead className="w-40">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell colSpan={6}>No sessions found</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
  }

  return (
    <>
      <div className="mb-2 text-sm text-muted-foreground">
        {sessionCount} {sessionLabel}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Speaker</TableHead>
            <TableHead className="w-40">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((session) => {
            const startTime = toDate(session.startTime);
            const endTime = toDate(session.endTime);

            return (
              <TableRow key={session.id}>
                <TableCell>{session.title}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{session.type}</Badge>
                </TableCell>
                <TableCell>
                  {startTime ? format(startTime, "MMM d, h:mm a") : "\u2014"} &ndash;{" "}
                  {endTime ? format(endTime, "MMM d, h:mm a") : "\u2014"}
                </TableCell>
                <TableCell>{session.location ?? "-"}</TableCell>
                <TableCell>{session.speakerName ?? "-"}</TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(session)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="ml-2 size-8"
                      aria-label="Delete"
                      onClick={() => onDelete(session.id)}
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
    </>
  );
});
