import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

describe("ImageUpload", () => {
  describe("deleteFileFn on image removal", () => {
    it("calls deleteFileFn with current URL when remove button is clicked", async () => {
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

      // Step 1: Remove existing image — should call deleteFileFn
      const removeButton = screen.getByRole("button");
      await user.click(removeButton);

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
