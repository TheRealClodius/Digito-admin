"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { whitelistEntrySchema } from "@/lib/schemas";

type SubmitStatus = "idle" | "saving" | "success" | "error";

// Derive from canonical schema — override lockedFields to accept comma-separated string input
const whitelistFormSchema = whitelistEntrySchema.extend({
  lockedFields: z.string().optional(),
});

type WhitelistFormValues = z.infer<typeof whitelistFormSchema>;

interface WhitelistFormProps {
  defaultValues?: {
    email?: string;
    accessTier?: "regular" | "premium" | "vip" | "staff";
    company?: string | null;
    lockedFields?: string[];
  };
  onSubmit: (data: {
    email: string;
    accessTier: "regular" | "premium" | "vip" | "staff";
    company?: string;
    lockedFields: string[];
  }) => void;
  onCancel: () => void;
  submitStatus?: SubmitStatus;
}

export function WhitelistForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitStatus = "idle",
}: WhitelistFormProps) {
  const isSubmitting = submitStatus === "saving";
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<WhitelistFormValues>({
    resolver: zodResolver(whitelistFormSchema),
    defaultValues: {
      email: defaultValues?.email ?? "",
      accessTier: defaultValues?.accessTier ?? "regular",
      company: defaultValues?.company ?? "",
      lockedFields: defaultValues?.lockedFields?.join(", ") ?? "",
    },
    mode: "onTouched",
  });

  const emailValue = watch("email");
  const isEmailEmpty = !emailValue || emailValue.trim() === "";

  const onFormSubmit = (data: WhitelistFormValues) => {
    const lockedFields = data.lockedFields
      ? data.lockedFields
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    onSubmit({
      email: data.email,
      accessTier: data.accessTier ?? "regular",
      company: data.company || undefined,
      lockedFields,
    });
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="grid grid-cols-2 gap-x-4 gap-y-6">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          {...register("email")}
          aria-required="true"
          required
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="accessTier">Access Tier</Label>
        <select
          id="accessTier"
          {...register("accessTier")}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="regular">regular</option>
          <option value="premium">premium</option>
          <option value="vip">vip</option>
          <option value="staff">staff</option>
        </select>
        {errors.accessTier && (
          <p className="text-sm text-destructive">{errors.accessTier.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="company">Company</Label>
        <Input
          id="company"
          {...register("company")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="lockedFields">Locked Fields</Label>
        <Input
          id="lockedFields"
          {...register("lockedFields")}
          placeholder="e.g. email, accessTier"
        />
        <p className="text-xs text-muted-foreground">
          Comma-separated list of field names
        </p>
      </div>

      <div className="col-span-2 flex items-center gap-2">
        <Button
          type="submit"
          disabled={isEmailEmpty || isSubmitting}
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
