"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useAppStore } from "@/store";
import { TaskCard } from "@/components/tasks/task-card";
import { cn } from "@/lib/utils";
import type { TaskWithRelations, Category, TaskStatus } from "@/types/database";
import { Plus, ChevronRight, ChevronDown } from "lucide-react";

interface ColumnProps {
  id: TaskStatus;
  title: string;
  color: string;
  tasks: TaskWithRelations[];
  categories: Category[];
  isDropTarget?: boolean;
  collapsible?: boolean;
}

export function Column({ id, title, color, tasks, categories, isDropTarget, collapsible }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });
  const { openNewTaskModal } = useAppStore();
  const [isCollapsed, setIsCollapsed] = useState(collapsible ? true : false);

  const showDropHighlight = isOver || isDropTarget;

  const handleColumnClick = () => {
    // Solo permitir crear tareas en ciertas columnas
    if (["pending", "today", "scheduled"].includes(id)) {
      openNewTaskModal(id);
    }
  };

  const handleHeaderClick = () => {
    if (collapsible) {
      setIsCollapsed(!isCollapsed);
    }
  };

  // Columna colapsada
  if (collapsible && isCollapsed) {
    return (
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-col min-w-[60px] w-[60px] rounded-lg bg-muted/50 transition-all duration-200 cursor-pointer hover:bg-muted",
          showDropHighlight && "bg-muted ring-2 ring-primary ring-offset-2"
        )}
        onClick={handleHeaderClick}
      >
        <div className="flex flex-col items-center gap-2 p-3 h-full">
          <div className={cn("w-3 h-3 rounded-full shrink-0", color)} />
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium writing-mode-vertical rotate-180" style={{ writingMode: "vertical-rl" }}>
            {title}
          </span>
          {tasks.length > 0 && (
            <span className="text-xs text-muted-foreground bg-background px-1.5 py-0.5 rounded-full mt-auto">
              {tasks.length}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col min-w-[280px] w-[280px] rounded-lg bg-muted/50 transition-all duration-200",
        showDropHighlight && "bg-muted ring-2 ring-primary ring-offset-2 scale-[1.02]"
      )}
    >
      {/* Header de la columna */}
      <div
        className={cn(
          "flex items-center gap-2 p-3 border-b",
          collapsible && "cursor-pointer hover:bg-muted/80"
        )}
        onClick={handleHeaderClick}
      >
        {collapsible && <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        <div className={cn("w-3 h-3 rounded-full", color)} />
        <h3 className="font-medium text-sm">{title}</h3>
        <span className="ml-auto text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>

      {/* Lista de tareas */}
      <div
        className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-220px)] min-h-[100px]"
        onClick={(e) => {
          // Solo abrir si se hace clic en el área vacía, no en una tarea
          if (e.target === e.currentTarget) {
            handleColumnClick();
          }
        }}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.length === 0 ? (
            <div
              className={cn(
                "text-center py-8 text-sm text-muted-foreground cursor-pointer rounded-lg border-2 border-dashed border-transparent hover:border-primary/30 hover:bg-primary/5 transition-colors",
                ["pending", "today", "scheduled"].includes(id) && "group"
              )}
              onClick={handleColumnClick}
            >
              <Plus className="h-6 w-6 mx-auto mb-2 opacity-0 group-hover:opacity-50 transition-opacity" />
              <span>Sin tareas</span>
              {["pending", "today", "scheduled"].includes(id) && (
                <p className="text-xs mt-1 opacity-0 group-hover:opacity-70 transition-opacity">
                  Clic para añadir
                </p>
              )}
            </div>
          ) : (
            <>
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  category={categories.find((c) => c.id === task.category_id)}
                />
              ))}
              {/* Área clicable debajo de las tareas */}
              {["pending", "today", "scheduled"].includes(id) && (
                <div
                  className="min-h-[60px] flex items-center justify-center text-muted-foreground cursor-pointer rounded-lg border-2 border-dashed border-transparent hover:border-primary/30 hover:bg-primary/5 transition-colors group"
                  onClick={handleColumnClick}
                >
                  <Plus className="h-4 w-4 opacity-0 group-hover:opacity-50 transition-opacity" />
                </div>
              )}
            </>
          )}
        </SortableContext>
      </div>
    </div>
  );
}
