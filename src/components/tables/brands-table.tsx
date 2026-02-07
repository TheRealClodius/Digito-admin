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
import { Switch } from "@/components/ui/switch";
import { Trash2 } from "lucide-react";
import type { Brand } from "@/types/brand";

interface BrandsTableProps {
  brands: Brand[];
  onEdit: (brand: Brand) => void;
  onDelete: (id: string) => void;
  onToggleHighlighted: (id: string, highlighted: boolean) => void;
}

export function BrandsTable({
  brands,
  onEdit,
  onDelete,
  onToggleHighlighted,
}: BrandsTableProps) {
  return (
    <div>
      <div className="mb-2">
        <Badge variant="secondary">
          {brands.length} brand(s)
        </Badge>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Logo</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Stall #</TableHead>
            <TableHead>Website</TableHead>
            <TableHead>Highlighted</TableHead>
            <TableHead className="w-40">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {brands.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center">
                No brands found
              </TableCell>
            </TableRow>
          ) : (
            brands.map((brand) => (
              <TableRow key={brand.id}>
                <TableCell>
                  {brand.logoUrl ? (
                    <img
                      src={brand.logoUrl}
                      alt={brand.name}
                      className="size-10 rounded object-cover"
                    />
                  ) : null}
                </TableCell>
                <TableCell>{brand.name}</TableCell>
                <TableCell>{brand.stallNumber ?? "—"}</TableCell>
                <TableCell>
                  {brand.websiteUrl ? brand.websiteUrl : "—"}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={brand.isHighlighted}
                    onCheckedChange={(checked) =>
                      onToggleHighlighted(brand.id, checked as boolean)
                    }
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(brand)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="ml-2 size-8"
                      aria-label="Delete"
                      onClick={() => onDelete(brand.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
