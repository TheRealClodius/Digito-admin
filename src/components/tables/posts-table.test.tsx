import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

// Mock Firebase modules before any imports that might trigger initialization
vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
}));
vi.mock("firebase/auth", () => ({ getAuth: vi.fn() }));
vi.mock("firebase/firestore", () => ({
  getFirestore: vi.fn(),
  Timestamp: {
    fromDate: (d: Date) => ({ toDate: () => d }),
    now: () => ({ toDate: () => new Date() }),
  },
}));
vi.mock("firebase/storage", () => ({ getStorage: vi.fn() }));

// Mock next/image so it renders a plain <img> in jsdom
vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

import { PostsTable } from "./posts-table";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePost(
  overrides: Partial<{
    id: string;
    imageUrl: string;
    description: string | null;
    authorName: string | null;
    authorAvatarUrl: string | null;
    createdAt: { toDate: () => Date };
  }> = {},
) {
  return {
    id: overrides.id ?? "post-1",
    imageUrl: overrides.imageUrl ?? "https://example.com/image.jpg",
    description:
      overrides.description !== undefined
        ? overrides.description
        : "A sample post",
    authorName:
      overrides.authorName !== undefined ? overrides.authorName : "Jane Doe",
    authorAvatarUrl:
      overrides.authorAvatarUrl !== undefined
        ? overrides.authorAvatarUrl
        : null,
    createdAt: overrides.createdAt ?? {
      toDate: () => new Date("2025-06-15T10:00:00Z"),
    },
  };
}

const samplePosts = [
  makePost({
    id: "p1",
    description: "First post",
    authorName: "Alice",
  }),
  makePost({
    id: "p2",
    description: "Second post",
    authorName: "Bob",
    createdAt: { toDate: () => new Date("2025-07-20T12:00:00Z") },
  }),
  makePost({
    id: "p3",
    description: null,
    authorName: null,
  }),
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PostsTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ----- Column headers -----

  describe("column headers", () => {
    it("renders table column headers: Image, Description, Author, Created, Actions", () => {
      render(
        <PostsTable
          posts={samplePosts}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />,
      );

      expect(
        screen.getByRole("columnheader", { name: /image/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("columnheader", { name: /description/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("columnheader", { name: /author/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("columnheader", { name: /created/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("columnheader", { name: /actions/i }),
      ).toBeInTheDocument();
    });
  });

  // ----- Rendering rows -----

  describe("rendering post rows", () => {
    it("renders a row for each post", () => {
      render(
        <PostsTable
          posts={samplePosts}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />,
      );

      const rows = screen.getAllByRole("row");
      // 1 header row + 3 data rows
      expect(rows.length).toBe(4);
    });

    it("displays post descriptions in the table", () => {
      render(
        <PostsTable
          posts={samplePosts}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />,
      );

      expect(screen.getByText("First post")).toBeInTheDocument();
      expect(screen.getByText("Second post")).toBeInTheDocument();
    });

    it("displays author names in the table", () => {
      render(
        <PostsTable
          posts={samplePosts}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />,
      );

      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("Bob")).toBeInTheDocument();
    });

    it("renders a thumbnail image for each post", () => {
      const post = makePost({
        id: "p-img",
        imageUrl: "https://example.com/photo.jpg",
      });

      render(
        <PostsTable posts={[post]} onEdit={vi.fn()} onDelete={vi.fn()} />,
      );

      const img = screen.getByRole("img");
      expect(img).toHaveAttribute("src", "https://example.com/photo.jpg");
    });

    it("handles null author name gracefully", () => {
      const post = makePost({
        id: "p-null-author",
        description: "No author post",
        authorName: null,
      });

      render(
        <PostsTable posts={[post]} onEdit={vi.fn()} onDelete={vi.fn()} />,
      );

      // The row should still render without error
      expect(screen.getByText("No author post")).toBeInTheDocument();
    });

    it("handles null description gracefully", () => {
      const post = makePost({
        id: "p-null-desc",
        description: null,
        authorName: "Charlie Smith",
      });

      render(
        <PostsTable posts={[post]} onEdit={vi.fn()} onDelete={vi.fn()} />,
      );

      // The row should still render without error
      expect(screen.getByText("Charlie Smith")).toBeInTheDocument();
    });
  });

  // ----- Empty state -----

  describe("empty state", () => {
    it('shows "No posts found" when given an empty array', () => {
      render(
        <PostsTable posts={[]} onEdit={vi.fn()} onDelete={vi.fn()} />,
      );

      expect(screen.getByText(/no posts found/i)).toBeInTheDocument();
    });

    it("does not render data rows when the posts array is empty", () => {
      render(
        <PostsTable posts={[]} onEdit={vi.fn()} onDelete={vi.fn()} />,
      );

      const rows = screen.getAllByRole("row");
      // Header row + 1 row containing the empty message
      expect(rows.length).toBeLessThanOrEqual(2);
    });
  });

  // ----- Description truncation -----

  describe("description truncation", () => {
    it("truncates long descriptions", () => {
      const longDescription = "A".repeat(200);
      const post = makePost({
        id: "p-long",
        description: longDescription,
      });

      render(
        <PostsTable posts={[post]} onEdit={vi.fn()} onDelete={vi.fn()} />,
      );

      // The full 200-character string should NOT appear verbatim
      const descriptionCell = screen.queryByText(longDescription);
      expect(descriptionCell).not.toBeInTheDocument();

      // But some truncated version of it should be present
      expect(screen.getByText(/A{2,}/)).toBeInTheDocument();
    });
  });

  // ----- Date display -----

  describe("date display", () => {
    it("formats and displays the created date", () => {
      const post = makePost({
        id: "p-date",
        createdAt: { toDate: () => new Date("2025-01-10T00:00:00Z") },
      });

      render(
        <PostsTable posts={[post]} onEdit={vi.fn()} onDelete={vi.fn()} />,
      );

      // The date should appear in the badge and/or the table cell
      const dateElements = screen.getAllByText(/Jan 10, 2025/);
      expect(dateElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ----- Edit action -----

  describe("edit action", () => {
    it("calls onEdit with the post when the edit button is clicked", async () => {
      const user = userEvent.setup();
      const onEdit = vi.fn();
      const post = makePost({ id: "p-edit", description: "Editable Post" });

      render(
        <PostsTable posts={[post]} onEdit={onEdit} onDelete={vi.fn()} />,
      );

      const editButton = screen.getByRole("button", { name: /edit/i });
      await user.click(editButton);

      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(onEdit).toHaveBeenCalledWith(
        expect.objectContaining({ id: "p-edit" }),
      );
    });

    it("calls onEdit with the correct post when multiple posts are present", async () => {
      const user = userEvent.setup();
      const onEdit = vi.fn();

      render(
        <PostsTable posts={samplePosts} onEdit={onEdit} onDelete={vi.fn()} />,
      );

      // Find the row containing "Second post" and click its edit button
      const secondRow = screen.getByText("Second post").closest("tr")!;
      const editButton = within(secondRow).getByRole("button", {
        name: /edit/i,
      });
      await user.click(editButton);

      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(onEdit).toHaveBeenCalledWith(
        expect.objectContaining({ id: "p2" }),
      );
    });
  });

  // ----- Delete action -----

  describe("delete action", () => {
    it("calls onDelete with the post id when the delete button is clicked", async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn();
      const post = makePost({ id: "p-del", description: "Deletable Post" });

      render(
        <PostsTable posts={[post]} onEdit={vi.fn()} onDelete={onDelete} />,
      );

      const deleteButton = screen.getByRole("button", { name: /delete/i });
      await user.click(deleteButton);

      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledWith("p-del");
    });

    it("calls onDelete with the correct id when multiple posts are present", async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn();

      render(
        <PostsTable
          posts={samplePosts}
          onEdit={vi.fn()}
          onDelete={onDelete}
        />,
      );

      const firstRow = screen.getByText("First post").closest("tr")!;
      const deleteButton = within(firstRow).getByRole("button", {
        name: /delete/i,
      });
      await user.click(deleteButton);

      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledWith("p1");
    });
  });

  // ----- Post count -----

  describe("post count", () => {
    it("displays the total number of posts", () => {
      render(
        <PostsTable
          posts={samplePosts}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />,
      );

      expect(screen.getByText(/3 post/)).toBeInTheDocument();
    });

    it("displays a count of 0 when no posts exist", () => {
      render(
        <PostsTable posts={[]} onEdit={vi.fn()} onDelete={vi.fn()} />,
      );

      expect(screen.getByText(/0 post/)).toBeInTheDocument();
    });

    it("updates count when a different number of posts is provided", () => {
      const twoPosts = samplePosts.slice(0, 2);

      render(
        <PostsTable
          posts={twoPosts}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />,
      );

      expect(screen.getByText(/2 post/)).toBeInTheDocument();
    });
  });

  // ----- Accessibility basics -----

  describe("accessibility", () => {
    it("renders a table element", () => {
      render(
        <PostsTable
          posts={samplePosts}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />,
      );

      expect(screen.getByRole("table")).toBeInTheDocument();
    });
  });
});
