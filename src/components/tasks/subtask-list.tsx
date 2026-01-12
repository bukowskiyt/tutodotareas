"use client";

import { useState } from "react";
import { useAppStore } from "@/store";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, X, GripVertical, Pencil, Check } from "lucide-react";
import type { Task, TaskWithRelations } from "@/types/database";
import { cn } from "@/lib/utils";

interface SubtaskListProps {
  task: TaskWithRelations;
  onUpdate: (updatedTask: TaskWithRelations) => void;
}

export function SubtaskList({ task, onUpdate }: SubtaskListProps) {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [adding, setAdding] = useState(false);

  const supabase = createClient();

  const subtasks = task.subtasks || [];
  const completedCount = subtasks.filter((s) => s.status === "completed").length;

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;

    setAdding(true);

    const newSubtask = {
      profile_id: task.profile_id,
      parent_task_id: task.id,
      title: newSubtaskTitle.trim(),
      priority: "medium" as const,
      status: "pending" as const,
      order: subtasks.length,
      is_recurring: false,
    };

    const { data, error } = await supabase
      .from("tasks")
      .insert(newSubtask)
      .select()
      .single();

    if (error) {
      toast.error("Error al crear la subtarea");
    } else {
      const updatedTask = {
        ...task,
        subtasks: [...subtasks, data as Task],
      };
      onUpdate(updatedTask);
      setNewSubtaskTitle("");
      toast.success("Subtarea añadida");
    }

    setAdding(false);
  };

  const handleToggleSubtask = async (subtask: Task) => {
    const newStatus = subtask.status === "completed" ? "pending" : "completed";
    const completedAt = newStatus === "completed" ? new Date().toISOString() : null;

    // Optimistic update
    const updatedSubtasks = subtasks.map((s) =>
      s.id === subtask.id
        ? { ...s, status: newStatus, completed_at: completedAt }
        : s
    );
    onUpdate({ ...task, subtasks: updatedSubtasks as Task[] });

    const { error } = await supabase
      .from("tasks")
      .update({
        status: newStatus,
        completed_at: completedAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", subtask.id);

    if (error) {
      toast.error("Error al actualizar la subtarea");
      // Revert
      onUpdate(task);
    }
  };

  const handleStartEdit = (subtask: Task) => {
    setEditingId(subtask.id);
    setEditingTitle(subtask.title);
  };

  const handleSaveEdit = async (subtaskId: string) => {
    if (!editingTitle.trim()) {
      setEditingId(null);
      return;
    }

    // Optimistic update
    const updatedSubtasks = subtasks.map((s) =>
      s.id === subtaskId ? { ...s, title: editingTitle.trim() } : s
    );
    onUpdate({ ...task, subtasks: updatedSubtasks as Task[] });

    const { error } = await supabase
      .from("tasks")
      .update({
        title: editingTitle.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", subtaskId);

    if (error) {
      toast.error("Error al editar la subtarea");
      onUpdate(task);
    }

    setEditingId(null);
    setEditingTitle("");
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    // Optimistic update
    const updatedSubtasks = subtasks.filter((s) => s.id !== subtaskId);
    onUpdate({ ...task, subtasks: updatedSubtasks });

    const { error } = await supabase.from("tasks").delete().eq("id", subtaskId);

    if (error) {
      toast.error("Error al eliminar la subtarea");
      onUpdate(task);
    } else {
      toast.success("Subtarea eliminada");
    }
  };

  return (
    <div className="space-y-3">
      {/* Header con contador */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {completedCount} de {subtasks.length} completadas
        </span>
      </div>

      {/* Lista de subtareas */}
      <div className="space-y-1">
        {subtasks.map((subtask) => (
          <div
            key={subtask.id}
            className={cn(
              "flex items-center gap-2 p-2 rounded-md group hover:bg-muted/50 transition-colors",
              subtask.status === "completed" && "opacity-60"
            )}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab" />

            <Checkbox
              checked={subtask.status === "completed"}
              onCheckedChange={() => handleToggleSubtask(subtask)}
            />

            {editingId === subtask.id ? (
              <div className="flex-1 flex items-center gap-2">
                <Input
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveEdit(subtask.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="h-7 text-sm"
                  autoFocus
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => handleSaveEdit(subtask.id)}
                >
                  <Check className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <>
                <span
                  className={cn(
                    "flex-1 text-sm cursor-pointer",
                    subtask.status === "completed" && "line-through text-muted-foreground"
                  )}
                  onDoubleClick={() => handleStartEdit(subtask)}
                >
                  {subtask.title}
                </span>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => handleStartEdit(subtask)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteSubtask(subtask.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Input para nueva subtarea */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Añadir subtarea..."
          value={newSubtaskTitle}
          onChange={(e) => setNewSubtaskTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAddSubtask();
          }}
          className="h-8 text-sm"
          disabled={adding}
        />
        <Button
          size="sm"
          variant="secondary"
          onClick={handleAddSubtask}
          disabled={!newSubtaskTitle.trim() || adding}
        >
          <Plus className="h-4 w-4 mr-1" />
          Añadir
        </Button>
      </div>
    </div>
  );
}
