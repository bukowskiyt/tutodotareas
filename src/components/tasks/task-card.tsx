"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAppStore } from "@/store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn, formatDate } from "@/lib/utils";
import type { TaskWithRelations, Category, Priority } from "@/types/database";
import {
  Calendar,
  Clock,
  MessageSquare,
  Paperclip,
  Repeat,
  CheckCircle2,
  Trash2,
  Edit,
  Flag,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface TaskCardProps {
  task: TaskWithRelations;
  category?: Category | null;
  isDragging?: boolean;
}

const priorityConfig: Record<Priority, { label: string; variant: "high" | "medium" | "low" }> = {
  high: { label: "Alta", variant: "high" },
  medium: { label: "Media", variant: "medium" },
  low: { label: "Baja", variant: "low" },
};

export function TaskCard({ task, category, isDragging }: TaskCardProps) {
  const {
    setSelectedTaskId,
    selectedTaskIds,
    toggleTaskSelection,
    updateTask,
    removeTask,
    categories,
    setCommentsModalTaskId,
  } = useAppStore();

  const supabase = createClient();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isSelected = selectedTaskIds.includes(task.id);
  const subtaskCount = task.subtasks?.length || 0;
  const completedSubtasks =
    task.subtasks?.filter((s) => s.status === "completed").length || 0;
  const commentCount = task.comments?.length || 0;
  const attachmentCount = task.attachments?.length || 0;

  const handleComplete = async () => {
    const newStatus = task.status === "completed" ? "pending" : "completed";
    const previousTask = { ...task };
    const updatedTask = {
      ...task,
      status: newStatus,
      completed_at: newStatus === "completed" ? new Date().toISOString() : null,
    };

    updateTask(updatedTask);

    const { error } = await supabase
      .from("tasks")
      .update({
        status: newStatus,
        completed_at: updatedTask.completed_at,
        updated_at: new Date().toISOString(),
      })
      .eq("id", task.id);

    if (error) {
      toast.error("Error al actualizar la tarea");
      updateTask(task);
    } else {
      toast.success(
        newStatus === "completed"
          ? "¡Tarea completada!"
          : "Tarea marcada como pendiente",
        {
          action: {
            label: "Deshacer",
            onClick: async () => {
              // Restaurar estado anterior
              updateTask(previousTask);
              await supabase
                .from("tasks")
                .update({
                  status: previousTask.status,
                  completed_at: previousTask.completed_at,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", task.id);
            },
          },
        }
      );
    }
  };

  const handleDelete = async () => {
    removeTask(task.id);

    const { error } = await supabase.from("tasks").delete().eq("id", task.id);

    if (error) {
      toast.error("Error al eliminar la tarea");
    } else {
      toast.success("Tarea eliminada");
    }
  };

  const handlePriorityChange = async (priority: Priority) => {
    const updatedTask = { ...task, priority };
    updateTask(updatedTask);

    const { error } = await supabase
      .from("tasks")
      .update({ priority, updated_at: new Date().toISOString() })
      .eq("id", task.id);

    if (error) {
      toast.error("Error al cambiar la prioridad");
      updateTask(task);
    }
  };

  const handleCategoryChange = async (categoryId: string | null) => {
    const updatedTask = { ...task, category_id: categoryId };
    updateTask(updatedTask);

    const { error } = await supabase
      .from("tasks")
      .update({ category_id: categoryId, updated_at: new Date().toISOString() })
      .eq("id", task.id);

    if (error) {
      toast.error("Error al cambiar la categoría");
      updateTask(task);
    }
  };

  // Generar estilo con color de categoría
  const cardStyle = {
    ...style,
    ...(category?.color && {
      backgroundColor: `${category.color}15`, // 15 = ~8% opacity in hex
      borderColor: `${category.color}30`,
    }),
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <Card
          ref={setNodeRef}
          style={cardStyle}
          {...attributes}
          {...listeners}
          className={cn(
            "task-card p-3 cursor-grab active:cursor-grabbing border",
            isDragging || isSortableDragging
              ? "opacity-50 shadow-lg scale-105"
              : "",
            isSelected && "ring-2 ring-primary",
            task.status === "completed" && "opacity-60"
          )}
          onClick={() => setSelectedTaskId(task.id)}
        >
          <div className="flex items-start gap-2">
            <Checkbox
              checked={task.status === "completed"}
              onCheckedChange={handleComplete}
              onClick={(e) => e.stopPropagation()}
              className="mt-0.5"
            />

            <div className="flex-1 min-w-0">
              {/* Categoría y prioridad */}
              <div className="flex items-center gap-1.5 mb-1.5">
                {category && (
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: category.color }}
                    title={category.name}
                  />
                )}
                <Badge
                  variant={priorityConfig[task.priority].variant}
                  className="text-[10px] px-1.5 py-0"
                >
                  {priorityConfig[task.priority].label}
                </Badge>
                {task.is_recurring && (
                  <Repeat className="h-3 w-3 text-muted-foreground" />
                )}
              </div>

              {/* Título */}
              <h4
                className={cn(
                  "text-sm font-medium leading-tight",
                  task.status === "completed" && "line-through"
                )}
              >
                {task.title}
              </h4>

              {/* Fecha y hora */}
              {(task.due_date || task.due_time) && (
                <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                  {task.due_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(task.due_date)}
                    </span>
                  )}
                  {task.due_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {task.due_time.slice(0, 5)}
                    </span>
                  )}
                </div>
              )}

              {/* Indicadores */}
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                {subtaskCount > 0 && (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {completedSubtasks}/{subtaskCount}
                  </span>
                )}
                {commentCount > 0 && (
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {commentCount}
                  </span>
                )}
                {attachmentCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Paperclip className="h-3 w-3" />
                    {attachmentCount}
                  </span>
                )}
              </div>
            </div>

            {/* Checkbox para selección múltiple */}
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => toggleTaskSelection(task.id)}
              onClick={(e) => e.stopPropagation()}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            />
          </div>
        </Card>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={handleComplete}>
          <CheckCircle2 className="mr-2 h-4 w-4" />
          {task.status === "completed" ? "Marcar pendiente" : "Completar"}
        </ContextMenuItem>

        <ContextMenuItem onClick={() => setSelectedTaskId(task.id)}>
          <Edit className="mr-2 h-4 w-4" />
          Editar
        </ContextMenuItem>

        <ContextMenuItem onClick={() => setCommentsModalTaskId(task.id)}>
          <MessageSquare className="mr-2 h-4 w-4" />
          Comentario
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Flag className="mr-2 h-4 w-4" />
            Prioridad
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem onClick={() => handlePriorityChange("high")}>
              <Badge variant="high" className="mr-2">
                Alta
              </Badge>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handlePriorityChange("medium")}>
              <Badge variant="medium" className="mr-2">
                Media
              </Badge>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handlePriorityChange("low")}>
              <Badge variant="low" className="mr-2">
                Baja
              </Badge>
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <div className="w-4 h-4 mr-2 rounded-full border" />
            Categoría
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem onClick={() => handleCategoryChange(null)}>
              Sin categoría
            </ContextMenuItem>
            {categories.map((cat) => (
              <ContextMenuItem
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
              >
                <div
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: cat.color }}
                />
                {cat.name}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSeparator />

        <ContextMenuItem
          onClick={handleDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Eliminar
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
