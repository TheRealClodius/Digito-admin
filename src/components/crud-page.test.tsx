import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CrudPage } from "./crud-page";

describe("CrudPage", () => {
  const defaultProps = {
    title: "Brands",
    description: "Manage brands for this event",
    addButtonLabel: "Add Brand",
    entityName: "brand",
    data: [
      { id: "1", name: "Brand A" },
      { id: "2", name: "Brand B" },
    ],
    loading: false,
    error: null,
    sheetOpen: false,
    setSheetOpen: vi.fn(),
    editingEntity: null,
    deletingEntityId: null,
    setDeletingEntityId: vi.fn(),
    submitStatus: "idle" as const,
    handleNew: vi.fn(),
    handleEdit: vi.fn(),
    handleSubmit: vi.fn(),
    handleDelete: vi.fn(),
    renderTable: vi.fn((data: unknown[]) => (
      <div data-testid="mock-table">{data.length} items</div>
    )),
    renderForm: vi.fn(() => <div data-testid="mock-form">Form</div>),
  };

  it("renders the title and description", () => {
    render(<CrudPage {...defaultProps} />);
    expect(screen.getByText("Brands")).toBeInTheDocument();
    expect(screen.getByText("Manage brands for this event")).toBeInTheDocument();
  });

  it("renders the add button with label", () => {
    render(<CrudPage {...defaultProps} />);
    expect(screen.getByRole("button", { name: /Add Brand/i })).toBeInTheDocument();
  });

  it("calls handleNew when add button is clicked", async () => {
    const user = userEvent.setup();
    render(<CrudPage {...defaultProps} />);
    await user.click(screen.getByRole("button", { name: /Add Brand/i }));
    expect(defaultProps.handleNew).toHaveBeenCalled();
  });

  it("renders error banner when error is set", () => {
    render(<CrudPage {...defaultProps} error={new Error("Network error")} />);
    expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
  });

  it("renders skeleton when loading", () => {
    const { container } = render(<CrudPage {...defaultProps} loading={true} />);
    // Skeletons are rendered
    expect(container.querySelectorAll("[class*='skeleton' i], [data-slot='skeleton']").length).toBeGreaterThan(0);
  });

  it("renders the table via renderTable when data is ready", () => {
    render(<CrudPage {...defaultProps} />);
    expect(screen.getByTestId("mock-table")).toBeInTheDocument();
    expect(defaultProps.renderTable).toHaveBeenCalledWith(
      defaultProps.data,
      expect.any(Function), // onEdit
      expect.any(Function), // onDelete
    );
  });

  it("renders the sheet form when sheetOpen is true", () => {
    render(<CrudPage {...defaultProps} sheetOpen={true} />);
    expect(screen.getByTestId("mock-form")).toBeInTheDocument();
  });

  it("shows edit title when editing", () => {
    render(
      <CrudPage
        {...defaultProps}
        sheetOpen={true}
        editingEntity={{ id: "1", name: "Brand A" }}
      />
    );
    expect(screen.getByText("Edit Brand")).toBeInTheDocument();
  });

  it("shows new title when creating", () => {
    render(
      <CrudPage
        {...defaultProps}
        sheetOpen={true}
        editingEntity={null}
      />
    );
    expect(screen.getByText("New Brand")).toBeInTheDocument();
  });

  it("renders delete dialog when deletingEntityId is set", () => {
    render(<CrudPage {...defaultProps} deletingEntityId="1" />);
    expect(screen.getByText(/delete brand/i)).toBeInTheDocument();
  });

  it("calls handleDelete on delete confirmation", async () => {
    const user = userEvent.setup();
    render(<CrudPage {...defaultProps} deletingEntityId="1" />);
    await user.click(screen.getByRole("button", { name: /delete/i }));
    expect(defaultProps.handleDelete).toHaveBeenCalled();
  });

  it("supports custom delete dialog text", () => {
    render(
      <CrudPage
        {...defaultProps}
        deletingEntityId="1"
        deleteTitle="Remove Entry"
        deleteDescription="Remove this person from the whitelist?"
        deleteActionLabel="Remove"
      />
    );
    expect(screen.getByText("Remove Entry")).toBeInTheDocument();
    expect(screen.getByText("Remove this person from the whitelist?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
  });

  it("supports custom sheet descriptions", () => {
    render(
      <CrudPage
        {...defaultProps}
        sheetOpen={true}
        editDescription="Update the brand details."
        newDescription="Add a new brand to this event."
      />
    );
    expect(screen.getByText("Add a new brand to this event.")).toBeInTheDocument();
  });

  it("renders extra header content via renderHeaderExtra", () => {
    render(
      <CrudPage
        {...defaultProps}
        renderHeaderExtra={() => <div data-testid="extra">Extra</div>}
      />
    );
    expect(screen.getByTestId("extra")).toBeInTheDocument();
  });
});
