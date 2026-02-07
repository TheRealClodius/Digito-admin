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
            <TableHead>Name</TableHead>
            <TableHead>Stall #</TableHead>
            <TableHead>Website</TableHead>
            <TableHead>Highlighted</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {brands.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center">
                No brands found
              </TableCell>
            </TableRow>
          ) : (
            brands.map((brand) => (
              <TableRow key={brand.id}>
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(brand)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="ml-2"
                    onClick={() => onDelete(brand.id)}
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
