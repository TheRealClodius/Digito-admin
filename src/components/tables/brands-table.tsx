"use client";

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
import { memo } from "react";
import { useTranslation } from "@/hooks/use-translation";

interface BrandsTableProps {
  brands: Brand[];
  onEdit: (brand: Brand) => void;
  onDelete: (id: string) => void;
  onToggleHighlighted: (id: string, highlighted: boolean) => void;
}

export const BrandsTable = memo(function BrandsTable({
  brands,
  onEdit,
  onDelete,
  onToggleHighlighted,
}: BrandsTableProps) {
  const { t } = useTranslation();

  return (
    <div>
      <div className="mb-2">
        <Badge variant="secondary">
          {t("brands.countLabel", { count: brands.length })}
        </Badge>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">{t("common.logo")}</TableHead>
            <TableHead>{t("common.name")}</TableHead>
            <TableHead>{t("brands.stallNumberShort")}</TableHead>
            <TableHead>{t("brands.website")}</TableHead>
            <TableHead>{t("common.highlighted")}</TableHead>
            <TableHead className="w-40">{t("common.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {brands.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center">
                {t("brands.noBrandsFound")}
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
                <TableCell>{brand.stallNumber ?? "\u2014"}</TableCell>
                <TableCell>
                  {brand.websiteUrl ? brand.websiteUrl : "\u2014"}
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
                      {t("common.edit")}
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="ml-2 size-8"
                      aria-label={t("common.delete")}
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
});
