"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/image-upload";
import { useUpload } from "@/hooks/use-upload";
import { participantSchema, type ParticipantFormValues } from "@/lib/schemas";

type SubmitStatus = "idle" | "saving" | "success" | "error";

const ROLE_OPTIONS = [
  "speaker",
  "panelist",
  "host",
  "brand_rep",
  "moderator",
  "performer",
  "other",
] as const;

interface ParticipantFormProps {
  defaultValues?: {
    firstName?: string;
    lastName?: string;
    email?: string | null;
    role?: string;
    company?: string | null;
    title?: string | null;
    bio?: string | null;
    avatarUrl?: string | null;
    websiteUrl?: string | null;
    linkedinUrl?: string | null;
    isHighlighted?: boolean;
  };
  onSubmit: (data: ParticipantFormValues) => void;
  onCancel: () => void;
  submitStatus?: SubmitStatus;
  storagePath?: string;
}

export function ParticipantForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitStatus = "idle",
  storagePath,
}: ParticipantFormProps) {
  const isSubmitting = submitStatus === "saving";
  const { upload } = useUpload({ basePath: storagePath ?? "" });
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ParticipantFormValues>({
    resolver: zodResolver(participantSchema),
    defaultValues: {
      firstName: defaultValues?.firstName ?? "",
      lastName: defaultValues?.lastName ?? "",
      email: defaultValues?.email ?? "",
      role: (defaultValues?.role as ParticipantFormValues["role"]) ?? "speaker",
      company: defaultValues?.company ?? "",
      title: defaultValues?.title ?? "",
      bio: defaultValues?.bio ?? "",
      avatarUrl: defaultValues?.avatarUrl ?? "",
      websiteUrl: defaultValues?.websiteUrl ?? "",
      linkedinUrl: defaultValues?.linkedinUrl ?? "",
      isHighlighted: defaultValues?.isHighlighted ?? false,
    },
    mode: "onTouched",
  });

  const firstNameValue = watch("firstName");
  const lastNameValue = watch("lastName");
  const avatarUrlValue = watch("avatarUrl");
  const isHighlightedValue = watch("isHighlighted");

  const isFirstNameEmpty = !firstNameValue || firstNameValue.trim() === "";
  const isLastNameEmpty = !lastNameValue || lastNameValue.trim() === "";

  return (
    <form onSubmit={handleSubmit((data) => onSubmit(data))} className="grid grid-cols-2 gap-x-4 gap-y-6">
      <div className="space-y-2">
        <Label htmlFor="firstName">First Name</Label>
        <Input
          id="firstName"
          aria-label="First Name"
          {...register("firstName")}
          aria-required="true"
          required
        />
        {errors.firstName && (
          <p className="text-sm text-destructive">{errors.firstName.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="lastName">Last Name</Label>
        <Input
          id="lastName"
          aria-label="Last Name"
          {...register("lastName")}
          aria-required="true"
          required
        />
        {errors.lastName && (
          <p className="text-sm text-destructive">{errors.lastName.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          aria-label="Email"
          type="email"
          {...register("email")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <select
          id="role"
          aria-label="Role"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          {...register("role")}
        >
          {ROLE_OPTIONS.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="company">Company</Label>
        <Input
          id="company"
          aria-label="Company"
          {...register("company")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          aria-label="Title"
          {...register("title")}
        />
      </div>

      <div className="col-span-2 space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          aria-label="Bio"
          {...register("bio")}
        />
      </div>

      <div className="col-span-2 space-y-2">
        <Label>Avatar</Label>
        <ImageUpload
          value={avatarUrlValue || null}
          onChange={(url) => setValue("avatarUrl", url)}
          uploadFn={storagePath ? (file) => upload(file, `avatar_${Date.now()}_${file.name}`) : undefined}
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="websiteUrl">Website URL</Label>
        <Input
          id="websiteUrl"
          aria-label="Website URL"
          {...register("websiteUrl")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
        <Input
          id="linkedinUrl"
          aria-label="LinkedIn URL"
          {...register("linkedinUrl")}
        />
      </div>

      <div className="col-span-2 flex items-center space-x-2">
        <input
          type="checkbox"
          role="switch"
          id="isHighlighted"
          aria-label="Highlighted"
          checked={isHighlightedValue}
          onChange={(e) => setValue("isHighlighted", e.target.checked)}
          className="h-4 w-4"
        />
        <Label htmlFor="isHighlighted">Highlighted</Label>
      </div>

      <div className="col-span-2 flex items-center gap-2">
        <Button
          type="submit"
          disabled={isFirstNameEmpty || isLastNameEmpty || isSubmitting}
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
