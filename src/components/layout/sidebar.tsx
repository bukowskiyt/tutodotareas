"use client";

import { MiniCalendar } from "@/components/calendar/mini-calendar";
import { CategoryList } from "@/components/categories/category-list";
import { Separator } from "@/components/ui/separator";

export function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-64 border-r bg-background p-4 gap-4 h-[calc(100vh-3.5rem)] sticky top-14">
      <MiniCalendar />
      <Separator />
      <CategoryList />
    </aside>
  );
}
