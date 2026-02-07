import { format } from "date-fns";
import Image from "next/image";

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
  return format(post.createdAt.toDate(), "MMM d, yyyy");
}

export function PostsTable({ posts, onEdit, onDelete }: PostsTableProps) {
  const dateSuffix =
    posts.length > 0
      ? " " + posts.map((p) => formatDate(p)).join(", ")
      : "";

  return (
    <div>
      <div className="mb-2">
        <Badge variant="secondary">
          {posts.length} post(s){dateSuffix}
        </Badge>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Image</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Author</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {posts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center">
                No posts found
              </TableCell>
            </TableRow>
          ) : (
            posts.map((post) => (
              <TableRow key={post.id}>
                <TableCell>
                  <Image
                    src={post.imageUrl}
                    alt={post.description || "Post image"}
                    width={64}
                    height={64}
                    className="rounded-md object-cover"
                  />
                </TableCell>
                <TableCell>
                  {truncateDescription(post.description)}
                </TableCell>
                <TableCell>{post.authorName ?? ""}</TableCell>
                <TableCell>{formatDate(post)}</TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(post)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="ml-2"
                    onClick={() => onDelete(post.id)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
