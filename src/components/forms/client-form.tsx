"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/image-upload";

type SubmitStatus = "idle" | "saving" | "success" | "error";

const clientFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

interface ClientFormProps {
  defaultValues?: {
    name?: string;
    description?: string | null;
    logoUrl?: string | null;
  };
  onSubmit: (data: ClientFormValues) => void;
  onCancel: () => void;
  submitStatus?: SubmitStatus;
}

export function ClientForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitStatus = "idle",
}: ClientFormProps) {
  const isSubmitting = submitStatus === "saving";
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      description: defaultValues?.description ?? "",
      logoUrl: defaultValues?.logoUrl ?? "",
    },
    mode: "onTouched",
  });

  const nameValue = watch("name");
  const logoUrlValue = watch("logoUrl");
  const isNameEmpty = !nameValue || nameValue.trim() === "";

  return (
    <form onSubmit={handleSubmit((data) => onSubmit(data))} className="grid grid-cols-2 gap-x-4 gap-y-6">
      <div className="col-span-2 space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          {...register("name")}
          aria-required="true"
          required
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="col-span-2 space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...register("description")}
        />
      </div>

      <div className="col-span-2 space-y-2">
        <Label>Logo</Label>
        <ImageUpload
          value={logoUrlValue || null}
          onChange={(url) => setValue("logoUrl", url)}
          disabled={isSubmitting}
        />
      </div>

      <div className="col-span-2 flex items-center gap-2">
        <Button
          type="submit"
          disabled={isNameEmpty || isSubmitting}
        >
          {isSubmitting ? "Saving..." : "Save"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        {submitStatus === "success" && (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <Check className="size-4" />
            Saved
          </span>
        )}
        {submitStatus === "error" && (
          <p className="text-sm text-destructive">Failed to save</p>
        )}
      </div>
    </form>
  );
}
