import type { UserPermissions, UserRole } from "@/types/permissions";

/** Only superadmins can manage (add/remove) other admins (clientAdmins) */
export function canManageAdmins(role: UserRole): boolean {
  return role === "superadmin";
}

/** Superadmins and clientAdmins can manage eventAdmins */
export function canManageEventAdmins(role: UserRole): boolean {
  return role === "superadmin" || role === "clientAdmin";
}

/** Check if permissions grant access to a specific client */
export function canAccessClient(
  permissions: UserPermissions,
  clientId: string
): boolean {
  if (permissions.role === "superadmin") return true;
  if (!permissions.clientIds) return false;
  return permissions.clientIds.includes(clientId);
}

/** Check if permissions grant access to a specific event */
export function canAccessEvent(
  permissions: UserPermissions,
  clientId: string,
  eventId: string
): boolean {
  if (permissions.role === "superadmin") return true;
  if (!canAccessClient(permissions, clientId)) return false;
  // clientAdmins have access to all events in their assigned clients
  if (permissions.role === "clientAdmin") return true;
  // eventAdmins need explicit event assignment
  if (!permissions.eventIds) return false;
  return permissions.eventIds.includes(eventId);
}

/** Only superadmins can create/edit/delete clients */
export function canWriteClient(role: UserRole): boolean {
  return role === "superadmin";
}

/** Superadmins and clientAdmins (for their clients) can create/edit/delete events */
export function canWriteEvent(
  permissions: UserPermissions,
  clientId: string
): boolean {
  if (permissions.role === "superadmin") return true;
  if (permissions.role === "clientAdmin") {
    return canAccessClient(permissions, clientId);
  }
  return false;
}

/** All admin roles can write event content within their scope */
export function canWriteEventContent(
  permissions: UserPermissions,
  clientId: string,
  eventId: string
): boolean {
  if (permissions.role === "superadmin") return true;
  if (permissions.role === "clientAdmin") {
    return canAccessClient(permissions, clientId);
  }
  if (permissions.role === "eventAdmin") {
    return canAccessEvent(permissions, clientId, eventId);
  }
  return false;
}

/** Get the list of accessible client IDs, or null for all */
export function getAccessibleClientIds(
  permissions: UserPermissions
): string[] | null {
  if (permissions.role === "superadmin") return null;
  return permissions.clientIds ?? [];
}

/** Get the list of accessible event IDs, or null for all */
export function getAccessibleEventIds(
  permissions: UserPermissions
): string[] | null {
  if (permissions.role === "superadmin") return null;
  if (permissions.role === "clientAdmin") return null;
  return permissions.eventIds ?? [];
}
