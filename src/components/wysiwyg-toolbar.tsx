"use client";

import type { Editor } from "@tiptap/react";
import { useTranslation } from "@/hooks/use-translation";
import {
  Bold,
  Italic,
  Underline,
  ChevronDown,
  Heading1,
  Heading2,
  Pilcrow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

interface WysiwygToolbarProps {
  editor: Editor | null;
}

export function WysiwygToolbar({ editor }: WysiwygToolbarProps) {
  const { t } = useTranslation();
  if (!editor) return null;

  const currentHeadingLabel = editor.isActive("heading", { level: 1 })
    ? t("common.title")
    : editor.isActive("heading", { level: 2 })
      ? t("wysiwyg.subtitle")
      : t("wysiwyg.paragraph");

  return (
    <div className="flex items-center gap-1 border-b px-2 py-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7"
        aria-label={t("wysiwyg.bold")}
        data-active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="size-3.5" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7"
        aria-label={t("wysiwyg.italic")}
        data-active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="size-3.5" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7"
        aria-label={t("wysiwyg.underline")}
        data-active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Underline className="size-3.5" />
      </Button>

      <Separator orientation="vertical" className="mx-1 h-5" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            aria-label={t("wysiwyg.headingStyle")}
          >
            {currentHeadingLabel}
            <ChevronDown className="size-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
          >
            <Heading1 className="size-4" />
            {t("common.title")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            <Heading2 className="size-4" />
            {t("wysiwyg.subtitle")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => editor.chain().focus().setParagraph().run()}
          >
            <Pilcrow className="size-4" />
            {t("wysiwyg.paragraph")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
