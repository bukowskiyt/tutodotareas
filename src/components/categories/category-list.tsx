"use client";

import { useAppStore } from "@/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Tag, X } from "lucide-react";

export function CategoryList() {
  const { categories, filterCategory, setFilterCategory } = useAppStore();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Tag className="h-4 w-4" />
          Categorías
        </h3>
        {filterCategory && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setFilterCategory(null)}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      <div className="space-y-1">
        {categories.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">
            Sin categorías
          </p>
        ) : (
          categories.map((category) => (
            <button
              key={category.id}
              onClick={() =>
                setFilterCategory(
                  filterCategory === category.id ? null : category.id
                )
              }
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                "hover:bg-accent",
                filterCategory === category.id && "bg-accent"
              )}
            >
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: category.color }}
              />
              <span className="truncate">{category.name}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
