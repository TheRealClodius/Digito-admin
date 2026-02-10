import { describe, it, expect } from "vitest";
import type { UserRole, UserPermissions } from "./permissions";

describe("UserPermissions types", () => {
  it("validates superadmin permissions structure", () => {
    const superadminPerms: UserPermissions = {
      userId: "test-uid-123",
      email: "andrei.clodius@goodgest.com",
      role: "superadmin",
      createdAt: new Date(),
      updatedAt: new Date(),
      clientIds: null, // null = full access
      eventIds: null,  // null = full access
      createdBy: "test-uid-123",
      updatedBy: "test-uid-123",
    };

    expect(superadminPerms.role).toBe("superadmin");
    expect(superadminPerms.clientIds).toBeNull();
    expect(superadminPerms.eventIds).toBeNull();
  });

  it("validates client-admin permissions structure", () => {
    const clientAdminPerms: UserPermissions = {
      userId: "test-uid-456",
      email: "client-admin@example.com",
      role: "clientAdmin",
      createdAt: new Date(),
      updatedAt: new Date(),
      clientIds: ["client-1", "client-2"], // Scoped access
      eventIds: null, // Can access all events in allowed clients
      createdBy: "superadmin-uid",
      updatedBy: "superadmin-uid",
    };

    expect(clientAdminPerms.role).toBe("clientAdmin");
    expect(clientAdminPerms.clientIds).toEqual(["client-1", "client-2"]);
  });

  it("validates event-admin permissions structure", () => {
    const eventAdminPerms: UserPermissions = {
      userId: "test-uid-789",
      email: "event-admin@example.com",
      role: "eventAdmin",
      createdAt: new Date(),
      updatedAt: new Date(),
      clientIds: ["client-1"], // Can only access specific client
      eventIds: ["event-1", "event-2"], // Scoped to specific events
      createdBy: "superadmin-uid",
      updatedBy: "superadmin-uid",
    };

    expect(eventAdminPerms.role).toBe("eventAdmin");
    expect(eventAdminPerms.eventIds).toEqual(["event-1", "event-2"]);
  });

  it("validates UserRole type constraints", () => {
    const validRoles: UserRole[] = ["superadmin", "clientAdmin", "eventAdmin"];

    expect(validRoles).toHaveLength(3);
    expect(validRoles).toContain("superadmin");
    expect(validRoles).toContain("clientAdmin");
    expect(validRoles).toContain("eventAdmin");
  });

  it("allows optional clientIds and eventIds fields", () => {
    // Without optional fields
    const minimalPerms: Partial<UserPermissions> = {
      userId: "test-uid",
      email: "test@example.com",
      role: "superadmin",
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: "test-uid",
      updatedBy: "test-uid",
    };

    expect(minimalPerms.clientIds).toBeUndefined();
    expect(minimalPerms.eventIds).toBeUndefined();
  });
});
