"use client";

import { useState } from "react";
import { UserX, UserCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useCollection } from "@/hooks/use-collection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface EventUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isActive: boolean;
}

interface UserManagementSectionProps {
  clientId: string;
  eventId: string;
}

type UserAction = { type: "deactivate" | "delete"; userId: string; email: string };

export function UserManagementSection({ clientId, eventId }: UserManagementSectionProps) {
  const { user: authUser } = useAuth();
  const { data: users, loading } = useCollection<EventUser & { id: string }>({
    path: `clients/${clientId}/events/${eventId}/users`,
    orderByField: "email",
    orderDirection: "asc",
  });

  const [pendingAction, setPendingAction] = useState<UserAction | null>(null);

  async function getToken() {
    if (!authUser) throw new Error("Not authenticated");
    return authUser.getIdToken();
  }

  async function handleDeactivate(userId: string) {
    try {
      const token = await getToken();
      const res = await fetch("/api/event-users/deactivate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ clientId, eventId, userId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to deactivate user");
      }
      toast.success("User deactivated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to deactivate user");
    }
  }

  async function handleReactivate(userId: string, email: string) {
    try {
      const token = await getToken();
      const res = await fetch("/api/event-users/reactivate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clientId,
          eventId,
          userId,
          whitelistData: { email, accessTier: "regular" },
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to reactivate user");
      }
      toast.success("User reactivated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reactivate user");
    }
  }

  async function handleDelete(userId: string) {
    try {
      const token = await getToken();
      const res = await fetch("/api/event-users/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ clientId, eventId, userId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete user");
      }
      toast.success("User deleted permanently");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete user");
    }
  }

  async function handleConfirmAction() {
    if (!pendingAction) return;
    const { type, userId, email } = pendingAction;
    setPendingAction(null);
    if (type === "deactivate") {
      await handleDeactivate(userId);
    } else if (type === "delete") {
      await handleDelete(userId);
    }
    // reactivate is handled directly (no confirmation needed per UX convention)
    void email; // used in deactivate
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Event Users</CardTitle>
          <CardDescription>
            Users who have signed up for this event via the app
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No users have signed up for this event yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-48">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.email}</TableCell>
                    <TableCell>
                      {u.firstName || u.lastName
                        ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {u.isActive ? (
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800">Deactivated</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {u.isActive ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setPendingAction({ type: "deactivate", userId: u.id, email: u.email })
                            }
                          >
                            <UserX className="mr-1 size-3.5" />
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReactivate(u.id, u.email)}
                          >
                            <UserCheck className="mr-1 size-3.5" />
                            Reactivate
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() =>
                            setPendingAction({ type: "delete", userId: u.id, email: u.email })
                          }
                        >
                          <Trash2 className="mr-1 size-3.5" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={!!pendingAction}
        onOpenChange={(open) => !open && setPendingAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.type === "deactivate" ? "Deactivate User" : "Delete User"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.type === "deactivate"
                ? "Are you sure? The user will lose access to this event. Their data will be preserved and you can reactivate them later."
                : "Are you sure you want to permanently delete this user? All their data (favorites, chats, feedback) will be removed and cannot be recovered."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction}>
              {pendingAction?.type === "deactivate" ? "Deactivate" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
