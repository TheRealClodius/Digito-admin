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

import { BrandsTable } from "./brands-table";

// ResizeObserver mock required by Radix Switch in jsdom
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBrand(
  overrides: Partial<{
    id: string;
    name: string;
    description: string | null;
    logoUrl: string | null;
    imageUrl: string | null;
    videoUrl: string | null;
    websiteUrl: string | null;
    instagramUrl: string | null;
    stallNumber: string | null;
    isHighlighted: boolean;
    createdAt: { toDate: () => Date };
  }> = {},
) {
  return {
    id: overrides.id ?? "brand-1",
    name: overrides.name ?? "Acme Brand",
    description:
      overrides.description !== undefined
        ? overrides.description
        : "A test brand",
    logoUrl:
      overrides.logoUrl !== undefined ? overrides.logoUrl : null,
    imageUrl:
      overrides.imageUrl !== undefined ? overrides.imageUrl : null,
    videoUrl:
      overrides.videoUrl !== undefined ? overrides.videoUrl : null,
    websiteUrl:
      overrides.websiteUrl !== undefined
        ? overrides.websiteUrl
        : "https://acme.com",
    instagramUrl:
      overrides.instagramUrl !== undefined
        ? overrides.instagramUrl
        : null,
    stallNumber:
      overrides.stallNumber !== undefined ? overrides.stallNumber : "A12",
    isHighlighted: overrides.isHighlighted ?? false,
    createdAt: overrides.createdAt ?? {
      toDate: () => new Date("2025-06-15T10:00:00Z"),
    },
  };
}

const sampleBrands = [
  makeBrand({
    id: "b1",
    name: "Acme Brand",
    stallNumber: "A1",
    websiteUrl: "https://acme.com",
    isHighlighted: true,
  }),
  makeBrand({
    id: "b2",
    name: "Globex Brand",
    stallNumber: "B2",
    websiteUrl: "https://globex.com",
    isHighlighted: false,
    createdAt: { toDate: () => new Date("2025-07-20T12:00:00Z") },
  }),
  makeBrand({
    id: "b3",
    name: "Initech Brand",
    stallNumber: null,
    websiteUrl: null,
    isHighlighted: false,
  }),
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("BrandsTable", () => {
  // ----- Column headers -----

  describe("column headers", () => {
    it("renders table column headers: Logo, Name, Stall #, Website, Highlighted, Actions", () => {
      render(
        <BrandsTable
          brands={sampleBrands}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onToggleHighlighted={vi.fn()}
        />,
      );

      expect(
        screen.getByRole("columnheader", { name: /logo/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("columnheader", { name: /name/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("columnheader", { name: /stall/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("columnheader", { name: /website/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("columnheader", { name: /highlighted/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("columnheader", { name: /actions/i }),
      ).toBeInTheDocument();
    });
  });

  // ----- Logo thumbnail -----

  describe("logo thumbnail", () => {
    it("renders an image when logoUrl is provided", () => {
      const brand = makeBrand({
        id: "b-logo",
        name: "Logo Brand",
        logoUrl: "https://example.com/logo.png",
      });

      render(
        <BrandsTable
          brands={[brand]}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onToggleHighlighted={vi.fn()}
        />,
      );

      const img = screen.getByRole("img", { name: /logo brand/i });
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", "https://example.com/logo.png");
    });

    it("does not render an image when logoUrl is null", () => {
      const brand = makeBrand({
        id: "b-no-logo",
        name: "No Logo Brand",
        logoUrl: null,
      });

      render(
        <BrandsTable
          brands={[brand]}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onToggleHighlighted={vi.fn()}
        />,
      );

      expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });
  });

  // ----- Rendering rows -----

  describe("rendering brand rows", () => {
    it("renders a row for each brand", () => {
      render(
        <BrandsTable
          brands={sampleBrands}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onToggleHighlighted={vi.fn()}
        />,
      );

      const rows = screen.getAllByRole("row");
      // 1 header row + 3 data rows
      expect(rows.length).toBe(4);
    });

    it("displays brand names in the table", () => {
      render(
        <BrandsTable
          brands={sampleBrands}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onToggleHighlighted={vi.fn()}
        />,
      );

      expect(screen.getByText("Acme Brand")).toBeInTheDocument();
      expect(screen.getByText("Globex Brand")).toBeInTheDocument();
      expect(screen.getByText("Initech Brand")).toBeInTheDocument();
    });

    it("displays stall numbers in the table", () => {
      render(
        <BrandsTable
          brands={sampleBrands}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onToggleHighlighted={vi.fn()}
        />,
      );

      expect(screen.getByText("A1")).toBeInTheDocument();
      expect(screen.getByText("B2")).toBeInTheDocument();
    });

    it("shows a dash for null stall numbers", () => {
      const brand = makeBrand({ id: "b-null-stall", name: "No Stall", stallNumber: null });

      render(
        <BrandsTable
          brands={[brand]}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onToggleHighlighted={vi.fn()}
        />,
      );

      const row = screen.getByText("No Stall").closest("tr")!;
      expect(within(row).getByText("—")).toBeInTheDocument();
    });

    it("displays website URLs in the table", () => {
      render(
        <BrandsTable
          brands={sampleBrands}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onToggleHighlighted={vi.fn()}
        />,
      );

      expect(screen.getByText("https://acme.com")).toBeInTheDocument();
      expect(screen.getByText("https://globex.com")).toBeInTheDocument();
    });
  });

  // ----- Empty state -----

  describe("empty state", () => {
    it('shows "No brands found" when given an empty array', () => {
      render(
        <BrandsTable
          brands={[]}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onToggleHighlighted={vi.fn()}
        />,
      );

      expect(screen.getByText(/no brands found/i)).toBeInTheDocument();
    });

    it("does not render data rows when the brands array is empty", () => {
      render(
        <BrandsTable
          brands={[]}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onToggleHighlighted={vi.fn()}
        />,
      );

      const rows = screen.getAllByRole("row");
      // Header row + 1 row containing the empty message
      expect(rows.length).toBeLessThanOrEqual(2);
    });
  });

  // ----- Edit action -----

  describe("edit action", () => {
    it("calls onEdit with the brand when the edit button is clicked", async () => {
      const user = userEvent.setup();
      const onEdit = vi.fn();
      const brand = makeBrand({ id: "b-edit", name: "Editable Brand" });

      render(
        <BrandsTable
          brands={[brand]}
          onEdit={onEdit}
          onDelete={vi.fn()}
          onToggleHighlighted={vi.fn()}
        />,
      );

      const editButton = screen.getByRole("button", { name: /edit/i });
      await user.click(editButton);

      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(onEdit).toHaveBeenCalledWith(
        expect.objectContaining({ id: "b-edit", name: "Editable Brand" }),
      );
    });

    it("calls onEdit with the correct brand when multiple brands are present", async () => {
      const user = userEvent.setup();
      const onEdit = vi.fn();

      render(
        <BrandsTable
          brands={sampleBrands}
          onEdit={onEdit}
          onDelete={vi.fn()}
          onToggleHighlighted={vi.fn()}
        />,
      );

      const globexRow = screen.getByText("Globex Brand").closest("tr")!;
      const editButton = within(globexRow).getByRole("button", { name: /edit/i });
      await user.click(editButton);

      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(onEdit).toHaveBeenCalledWith(
        expect.objectContaining({ id: "b2", name: "Globex Brand" }),
      );
    });
  });

  // ----- Delete action -----

  describe("delete action", () => {
    it("calls onDelete with the brand id when the delete button is clicked", async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn();
      const brand = makeBrand({ id: "b-del", name: "Deletable Brand" });

      render(
        <BrandsTable
          brands={[brand]}
          onEdit={vi.fn()}
          onDelete={onDelete}
          onToggleHighlighted={vi.fn()}
        />,
      );

      const deleteButton = screen.getByRole("button", { name: /delete/i });
      await user.click(deleteButton);

      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledWith("b-del");
    });

    it("calls onDelete with the correct id when multiple brands are present", async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn();

      render(
        <BrandsTable
          brands={sampleBrands}
          onEdit={vi.fn()}
          onDelete={onDelete}
          onToggleHighlighted={vi.fn()}
        />,
      );

      const initechRow = screen.getByText("Initech Brand").closest("tr")!;
      const deleteButton = within(initechRow).getByRole("button", {
        name: /delete/i,
      });
      await user.click(deleteButton);

      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledWith("b3");
    });
  });

  // ----- Highlight toggle -----

  describe("highlight toggle", () => {
    it("renders a switch for each brand", () => {
      render(
        <BrandsTable
          brands={sampleBrands}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onToggleHighlighted={vi.fn()}
        />,
      );

      const switches = screen.getAllByRole("switch");
      expect(switches.length).toBe(3);
    });

    it("renders the switch as checked for highlighted brands", () => {
      const brand = makeBrand({ id: "b-hi", name: "Highlighted", isHighlighted: true });

      render(
        <BrandsTable
          brands={[brand]}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onToggleHighlighted={vi.fn()}
        />,
      );

      const toggle = screen.getByRole("switch");
      expect(toggle).toHaveAttribute("data-state", "checked");
    });

    it("renders the switch as unchecked for non-highlighted brands", () => {
      const brand = makeBrand({ id: "b-lo", name: "Not Highlighted", isHighlighted: false });

      render(
        <BrandsTable
          brands={[brand]}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onToggleHighlighted={vi.fn()}
        />,
      );

      const toggle = screen.getByRole("switch");
      expect(toggle).toHaveAttribute("data-state", "unchecked");
    });

    it("calls onToggleHighlighted with id and new value when switch is clicked", async () => {
      const user = userEvent.setup();
      const onToggleHighlighted = vi.fn();
      const brand = makeBrand({ id: "b-toggle", name: "Toggle Brand", isHighlighted: false });

      render(
        <BrandsTable
          brands={[brand]}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onToggleHighlighted={onToggleHighlighted}
        />,
      );

      const toggle = screen.getByRole("switch");
      await user.click(toggle);

      expect(onToggleHighlighted).toHaveBeenCalledTimes(1);
      expect(onToggleHighlighted).toHaveBeenCalledWith("b-toggle", true);
    });
  });

  // ----- Brand count -----

  describe("brand count", () => {
    it("displays the total number of brands", () => {
      render(
        <BrandsTable
          brands={sampleBrands}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onToggleHighlighted={vi.fn()}
        />,
      );

      expect(screen.getByText(/3 brand/)).toBeInTheDocument();
    });

    it("displays a count of 0 when no brands exist", () => {
      render(
        <BrandsTable
          brands={[]}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onToggleHighlighted={vi.fn()}
        />,
      );

      expect(screen.getByText(/0 brand/)).toBeInTheDocument();
    });

    it("updates count when a different number of brands is provided", () => {
      const twoBrands = sampleBrands.slice(0, 2);

      render(
        <BrandsTable
          brands={twoBrands}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onToggleHighlighted={vi.fn()}
        />,
      );

      expect(screen.getByText(/2 brand/)).toBeInTheDocument();
    });
  });

  // ----- Accessibility basics -----

  describe("accessibility", () => {
    it("renders a table element", () => {
      render(
        <BrandsTable
          brands={sampleBrands}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onToggleHighlighted={vi.fn()}
        />,
      );

      expect(screen.getByRole("table")).toBeInTheDocument();
    });
  });
});
