import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

// Mock Firebase modules
vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
}));
vi.mock("firebase/auth", () => ({ getAuth: vi.fn() }));
vi.mock("firebase/firestore", () => ({ getFirestore: vi.fn() }));
vi.mock("firebase/storage", () => ({ getStorage: vi.fn() }));

// Mock next/image to avoid jsdom issues
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

import { ImageUpload } from "./image-upload";

// URL.createObjectURL / revokeObjectURL are not available in jsdom
beforeAll(() => {
  global.URL.createObjectURL = vi.fn(() => "blob:preview-url");
  global.URL.revokeObjectURL = vi.fn();
});

// rAF mock infrastructure for dissolve animation
let rafCallbacks: Array<{ id: number; cb: (time: number) => void }> = [];
let nextRafId = 1;
let mockTime = 0;

function tickFrame(advanceMs: number) {
  mockTime += advanceMs;
  const cbs = [...rafCallbacks];
  rafCallbacks = [];
  cbs.forEach(({ cb }) => cb(mockTime));
}

function completeDissolve() {
  // Tick enough frames to complete the 1300ms default animation
  let elapsed = 0;
  while (elapsed < 1400) {
    tickFrame(50);
    elapsed += 50;
  }
}

beforeEach(() => {
  rafCallbacks = [];
  nextRafId = 1;
  mockTime = 0;

  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    const id = nextRafId++;
    rafCallbacks.push({ id, cb });
    return id;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
    rafCallbacks = rafCallbacks.filter((entry) => entry.id !== id);
  });
  vi.spyOn(performance, "now").mockImplementation(() => mockTime);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ImageUpload", () => {
  describe("deleteFileFn on image removal", () => {
    it("calls deleteFileFn with current URL after dissolve animation", async () => {
      const user = userEvent.setup();
      const deleteFileFn = vi.fn().mockResolvedValue(undefined);
      const onChange = vi.fn();

      render(
        <ImageUpload
          value="https://storage.example.com/old-image.png"
          onChange={onChange}
          deleteFileFn={deleteFileFn}
        />
      );

      const removeButton = screen.getByRole("button");
      await user.click(removeButton);

      // Delete is deferred until animation completes
      expect(deleteFileFn).not.toHaveBeenCalled();

      act(() => {
        completeDissolve();
      });

      expect(deleteFileFn).toHaveBeenCalledWith(
        "https://storage.example.com/old-image.png"
      );
      expect(onChange).toHaveBeenCalledWith(null);
    });

    it("does not throw when deleteFileFn is not provided", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(
        <ImageUpload
          value="https://storage.example.com/old-image.png"
          onChange={onChange}
        />
      );

      const removeButton = screen.getByRole("button");
      await user.click(removeButton);

      act(() => {
        completeDissolve();
      });

      // Should still call onChange(null) without errors
      expect(onChange).toHaveBeenCalledWith(null);
    });

    it("swallows deleteFileFn errors on removal", async () => {
      const user = userEvent.setup();
      const deleteFileFn = vi
        .fn()
        .mockRejectedValue(new Error("Delete failed"));
      const onChange = vi.fn();

      render(
        <ImageUpload
          value="https://storage.example.com/old-image.png"
          onChange={onChange}
          deleteFileFn={deleteFileFn}
        />
      );

      const removeButton = screen.getByRole("button");
      await user.click(removeButton);

      act(() => {
        completeDissolve();
      });

      expect(deleteFileFn).toHaveBeenCalled();
      expect(onChange).toHaveBeenCalledWith(null);
    });

    it("does not call deleteFileFn when value is null", async () => {
      const user = userEvent.setup();
      const deleteFileFn = vi.fn();
      const onChange = vi.fn();

      // Render with a value, then simulate the parent clearing it
      const { rerender } = render(
        <ImageUpload
          value="https://storage.example.com/image.png"
          onChange={onChange}
          deleteFileFn={deleteFileFn}
        />
      );

      // Rerender with null value - shows dropzone, no remove button
      rerender(
        <ImageUpload
          value={null}
          onChange={onChange}
          deleteFileFn={deleteFileFn}
        />
      );

      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(deleteFileFn).not.toHaveBeenCalled();
    });
  });

  describe("deleteFileFn on image replacement", () => {
    it("cleans up old file during remove-then-reupload flow", async () => {
      const user = userEvent.setup();
      const deleteFileFn = vi.fn().mockResolvedValue(undefined);
      const uploadFn = vi
        .fn()
        .mockResolvedValue("https://storage.example.com/new-image.png");
      let currentValue: string | null =
        "https://storage.example.com/old-image.png";
      const onChange = vi.fn((url: string | null) => {
        currentValue = url;
      });

      // Render with existing value (shows image + remove button)
      const { rerender } = render(
        <ImageUpload
          value={currentValue}
          onChange={onChange}
          uploadFn={uploadFn}
          deleteFileFn={deleteFileFn}
        />
      );

      // Step 1: Remove existing image — dissolve animation starts
      const removeButton = screen.getByRole("button");
      await user.click(removeButton);

      // Complete the dissolve animation
      act(() => {
        completeDissolve();
      });

      expect(deleteFileFn).toHaveBeenCalledWith(
        "https://storage.example.com/old-image.png"
      );
      expect(onChange).toHaveBeenCalledWith(null);

      // Step 2: Parent re-renders with null value → dropzone appears
      rerender(
        <ImageUpload
          value={currentValue}
          onChange={onChange}
          uploadFn={uploadFn}
          deleteFileFn={deleteFileFn}
        />
      );

      // Dropzone should now be visible
      expect(
        screen.getByText(/drag & drop or click to upload/i)
      ).toBeInTheDocument();

      // Step 3: Upload a new file via the dropzone input
      deleteFileFn.mockClear();

      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      expect(input).not.toBeNull();

      const file = new File(["img"], "photo.png", { type: "image/png" });
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(uploadFn).toHaveBeenCalledWith(file);
      });

      // deleteFileFn should NOT be called again (value is null now)
      expect(deleteFileFn).not.toHaveBeenCalled();
      expect(onChange).toHaveBeenCalledWith(
        "https://storage.example.com/new-image.png"
      );
    });
  });

  describe("dissolve animation on delete", () => {
    it("disables delete button during dissolve animation", async () => {
      const user = userEvent.setup();
      render(
        <ImageUpload
          value="https://storage.example.com/image.png"
          onChange={vi.fn()}
        />
      );

      const removeButton = screen.getByRole("button");
      await user.click(removeButton);

      expect(removeButton).toBeDisabled();

      act(() => {
        completeDissolve();
      });
    });

    it("always applies SVG filter to image (scale=0 means invisible until animated)", () => {
      render(
        <ImageUpload
          value="https://storage.example.com/image.png"
          onChange={vi.fn()}
        />
      );

      const img = screen.getByAltText("Upload preview");
      expect(img.style.filter).toMatch(/url\(#dissolve-/);
    });

    it("delays deleteFileFn and onChange until animation completes", async () => {
      const user = userEvent.setup();
      const deleteFileFn = vi.fn().mockResolvedValue(undefined);
      const onChange = vi.fn();

      render(
        <ImageUpload
          value="https://storage.example.com/image.png"
          onChange={onChange}
          deleteFileFn={deleteFileFn}
        />
      );

      const removeButton = screen.getByRole("button");
      await user.click(removeButton);

      // Mid-animation: neither should have been called
      act(() => {
        tickFrame(200);
      });
      expect(deleteFileFn).not.toHaveBeenCalled();
      expect(onChange).not.toHaveBeenCalled();

      // Complete animation
      act(() => {
        completeDissolve();
      });

      expect(deleteFileFn).toHaveBeenCalledWith(
        "https://storage.example.com/image.png"
      );
      expect(onChange).toHaveBeenCalledWith(null);
    });

    it("renders inline SVG filter element when image is displayed", () => {
      render(
        <ImageUpload
          value="https://storage.example.com/image.png"
          onChange={vi.fn()}
        />
      );

      const filter = document.querySelector("filter");
      expect(filter).not.toBeNull();
      expect(filter?.id).toMatch(/^dissolve-/);
    });

    it("updates aria-label to deleting during animation", async () => {
      const user = userEvent.setup();
      render(
        <ImageUpload
          value="https://storage.example.com/image.png"
          onChange={vi.fn()}
        />
      );

      const removeButton = screen.getByRole("button");
      expect(removeButton).toHaveAttribute("aria-label", "Delete");

      await user.click(removeButton);

      expect(removeButton).toHaveAttribute("aria-label", "Deleting...");

      act(() => {
        completeDissolve();
      });
    });

    it("cleans up animation on unmount during dissolve", async () => {
      const user = userEvent.setup();
      const deleteFileFn = vi.fn().mockResolvedValue(undefined);

      const { unmount } = render(
        <ImageUpload
          value="https://storage.example.com/image.png"
          onChange={vi.fn()}
          deleteFileFn={deleteFileFn}
        />
      );

      const removeButton = screen.getByRole("button");
      await user.click(removeButton);

      // Unmount mid-animation
      unmount();

      expect(window.cancelAnimationFrame).toHaveBeenCalled();
      // deleteFileFn should NOT be called since animation was cancelled
      expect(deleteFileFn).not.toHaveBeenCalled();
    });
  });

  describe("rendering states", () => {
    it("shows dropzone when there is no value", () => {
      render(<ImageUpload value={null} onChange={vi.fn()} />);

      expect(
        screen.getByText(/drag & drop or click to upload/i)
      ).toBeInTheDocument();
    });

    it("shows image preview when there is a value", () => {
      render(
        <ImageUpload
          value="https://storage.example.com/image.png"
          onChange={vi.fn()}
        />
      );

      const img = screen.getByAltText("Upload preview");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute(
        "src",
        "https://storage.example.com/image.png"
      );
    });

    it("shows remove button when there is a value", () => {
      render(
        <ImageUpload
          value="https://storage.example.com/image.png"
          onChange={vi.fn()}
        />
      );

      expect(screen.getByRole("button")).toBeInTheDocument();
    });
  });
});
