"use client";

import { format } from "date-fns";
import { memo } from "react";
import Image from "next/image";
import { Trash2, ImageOff } from "lucide-react";

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toDate } from "@/lib/timestamps";
import { isAllowedImageHost } from "@/lib/validation";
import { useTranslation } from "@/hooks/use-translation";
import type { Post } from "@/types/post";

interface PostsTableProps {
  posts: Post[];
  onEdit: (post: Post) => void;
  onDelete: (id: string) => void;
}

function truncateDescription(
  description: string | null | undefined,
  maxLength = 100,
): string {
  if (!description) return "";
  if (description.length <= maxLength) return description;
  return description.slice(0, maxLength) + "...";
}

function formatDate(post: Post): string {
  const d = toDate(post.createdAt);
  return d ? format(d, "MMM d, yyyy") : "\u2014";
}

export const PostsTable = memo(function PostsTable({ posts, onEdit, onDelete }: PostsTableProps) {
  const { t } = useTranslation();

  const dateSuffix =
    posts.length > 0
      ? " " + posts.map((p) => formatDate(p)).join(", ")
      : "";

  return (
    <div>
      <div className="mb-2">
        <Badge variant="secondary">
          {t("posts.countLabel", { count: posts.length })}{dateSuffix}
        </Badge>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("common.image")}</TableHead>
            <TableHead>{t("common.description")}</TableHead>
            <TableHead>{t("posts.author")}</TableHead>
            <TableHead>{t("posts.created")}</TableHead>
            <TableHead className="w-40">{t("common.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {posts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center">
                {t("posts.noPostsFound")}
              </TableCell>
            </TableRow>
          ) : (
            posts.map((post) => {
              const hasValidImage = isAllowedImageHost(post.imageUrl);
              return (
                <TableRow key={post.id}>
                  <TableCell>
                    {hasValidImage ? (
                      <Image
                        src={post.imageUrl}
                        alt={post.description || t("posts.postImage")}
                        width={64}
                        height={64}
                        className="rounded-md object-cover"
                      />
                    ) : (
                      <div className="flex size-16 items-center justify-center rounded-md bg-muted">
                        <ImageOff className="size-6 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {truncateDescription(post.description)}
                  </TableCell>
                  <TableCell>{post.authorName ?? ""}</TableCell>
                  <TableCell>{formatDate(post)}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(post)}
                      >
                        {t("common.edit")}
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="ml-2 size-8"
                        aria-label={t("common.delete")}
                        onClick={() => onDelete(post.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
});
