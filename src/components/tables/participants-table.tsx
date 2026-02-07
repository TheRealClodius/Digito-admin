import type { Participant } from "@/types/participant";
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

interface ParticipantsTableProps {
  participants: Participant[];
  onEdit: (participant: Participant) => void;
  onDelete: (id: string) => void;
}

export function ParticipantsTable({
  participants,
  onEdit,
  onDelete,
}: ParticipantsTableProps) {
  return (
    <div>
      <div className="mb-2">
        <Badge variant="secondary">
          {participants.length} participant(s)
        </Badge>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Highlighted</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {participants.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center">
                No participants found
              </TableCell>
            </TableRow>
          ) : (
            participants.map((participant) => (
              <TableRow key={participant.id}>
                <TableCell>
                  {participant.firstName} {participant.lastName}
                </TableCell>
                <TableCell>
                  <Badge>{participant.role}</Badge>
                </TableCell>
                <TableCell>{participant.company ?? ""}</TableCell>
                <TableCell>{participant.email ?? ""}</TableCell>
                <TableCell>{participant.isHighlighted ? "Yes" : "No"}</TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(participant)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="ml-2"
                    onClick={() => onDelete(participant.id)}
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
