import { format } from "date-fns";
import type { Session } from "@/types/session";
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

interface SessionsTableProps {
  sessions: Session[];
  onEdit: (session: Session) => void;
  onDelete: (sessionId: string) => void;
}

export function SessionsTable({
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
            <TableHead>Actions</TableHead>
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
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((session) => {
            const startTime = session.startTime.toDate();
            const endTime = session.endTime.toDate();

            return (
              <TableRow key={session.id}>
                <TableCell>{session.title}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{session.type}</Badge>
                </TableCell>
                <TableCell>
                  {format(startTime, "MMM d, h:mm a")} &ndash;{" "}
                  {format(endTime, "MMM d, h:mm a")}
                </TableCell>
                <TableCell>{session.location ?? "-"}</TableCell>
                <TableCell>{session.speakerName ?? "-"}</TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(session)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onDelete(session.id)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </>
  );
}
