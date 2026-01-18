"use client";

import { useAppStore } from "@/store";
import { TaskColumns } from "@/components/columns/task-columns";
import { TaskCalendar } from "@/components/calendar/task-calendar";
import type { TaskWithRelations, Category } from "@/types/database";

interface ViewSwitcherProps {
  tasks: TaskWithRelations[];
  categories: Category[];
  currentProfileId?: string;
}

export function ViewSwitcher({
  tasks,
  categories,
  currentProfileId,
}: ViewSwitcherProps) {
  const { view } = useAppStore();

  if (view === "calendar") {
    return (
      <TaskCalendar
        tasks={tasks}
        categories={categories}
        currentProfileId={currentProfileId}
      />
    );
  }

  return (
    <TaskColumns
      tasks={tasks}
      categories={categories}
      currentProfileId={currentProfileId}
    />
  );
}
