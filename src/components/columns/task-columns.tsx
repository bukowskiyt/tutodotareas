"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/store";
import { Column } from "./column";
import { TaskDetailPanel } from "@/components/tasks/task-detail-panel";
import { NewTaskButton } from "@/components/tasks/new-task-button";
import { DatePickerModal } from "@/components/tasks/date-picker-modal";
import { CommentsModal } from "@/components/tasks/comments-modal";
import type { TaskWithRelations, Category, TaskStatus } from "@/types/database";
import { isToday, isPast, isFuture } from "@/lib/utils";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
  pointerWithin,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { TaskCard } from "@/components/tasks/task-card";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface TaskColumnsProps {
  tasks: TaskWithRelations[];
  categories: Category[];
  currentProfileId?: string;
}

const COLUMN_CONFIG: {
  id: TaskStatus;
  title: string;
  color: string;
  collapsible?: boolean;
}[] = [
  { id: "pending", title: "Pendientes", color: "bg-gray-500" },
  { id: "today", title: "Hoy", color: "bg-blue-500" },
  { id: "scheduled", title: "Programadas", color: "bg-purple-500" },
  { id: "overdue", title: "Atrasadas", color: "bg-red-500" },
  { id: "completed", title: "Completadas", color: "bg-green-500", collapsible: true },
];

// Archivadas se omite de la vista principal

export function TaskColumns({
  tasks: initialTasks,
  categories: initialCategories,
  currentProfileId,
}: TaskColumnsProps) {
  const {
    tasks,
    setTasks,
    categories,
    setCategories,
    selectedTaskId,
    searchQuery,
    filterCategory,
    filterPriority,
    selectedDate,
    updateTask,
    commentsModalTaskId,
    setCommentsModalTaskId,
  } = useAppStore();

  const [activeTask, setActiveTask] = useState<TaskWithRelations | null>(null);
  const [activeColumn, setActiveColumn] = useState<TaskStatus | null>(null);
  const [pendingDateTask, setPendingDateTask] = useState<{
    task: TaskWithRelations;
    targetStatus: TaskStatus;
  } | null>(null);
  const supabase = createClient();

  const VALID_COLUMNS: TaskStatus[] = ["pending", "today", "scheduled", "overdue", "completed", "archived"];

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Inicializar tareas y categorías
  useEffect(() => {
    setTasks(initialTasks as TaskWithRelations[]);
    setCategories(initialCategories);
  }, [initialTasks, initialCategories, setTasks, setCategories]);

  // Calcular el estado real de cada tarea basado en la fecha
  const tasksWithCalculatedStatus = useMemo(() => {
    return tasks.map((task) => {
      if (task.status === "completed" || task.status === "archived") {
        return task;
      }

      if (!task.due_date) {
        return { ...task, status: "pending" as TaskStatus };
      }

      const dueDate = new Date(task.due_date);

      if (isToday(dueDate)) {
        return { ...task, status: "today" as TaskStatus };
      }

      if (isPast(dueDate)) {
        return { ...task, status: "overdue" as TaskStatus };
      }

      if (isFuture(dueDate)) {
        return { ...task, status: "scheduled" as TaskStatus };
      }

      return task;
    });
  }, [tasks]);

  // Filtrar tareas
  const filteredTasks = useMemo(() => {
    return tasksWithCalculatedStatus.filter((task) => {
      // Filtro de búsqueda
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesDescription = task.description
          ?.toLowerCase()
          .includes(query);
        if (!matchesTitle && !matchesDescription) return false;
      }

      // Filtro de categoría
      if (filterCategory && task.category_id !== filterCategory) {
        return false;
      }

      // Filtro de prioridad
      if (filterPriority && task.priority !== filterPriority) {
        return false;
      }

      // Filtro de fecha seleccionada
      if (selectedDate && task.due_date) {
        const taskDate = new Date(task.due_date);
        if (
          taskDate.toDateString() !== selectedDate.toDateString()
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    tasksWithCalculatedStatus,
    searchQuery,
    filterCategory,
    filterPriority,
    selectedDate,
  ]);

  // Agrupar tareas por columna
  const tasksByColumn = useMemo(() => {
    const grouped: Record<TaskStatus, TaskWithRelations[]> = {
      pending: [],
      today: [],
      scheduled: [],
      overdue: [],
      completed: [],
      archived: [],
    };

    filteredTasks.forEach((task) => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });

    // Ordenar por prioridad y luego por orden
    Object.keys(grouped).forEach((status) => {
      grouped[status as TaskStatus].sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const priorityDiff =
          priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.order - b.order;
      });
    });

    return grouped;
  }, [filteredTasks]);

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) {
      setActiveTask(task);
      setActiveColumn(task.status);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (!over) {
      setActiveColumn(null);
      return;
    }

    const overId = over.id as string;

    // Verificar si over.id es una columna válida
    if (VALID_COLUMNS.includes(overId as TaskStatus)) {
      setActiveColumn(overId as TaskStatus);
      return;
    }

    // Si no es una columna, buscar si es una tarea y en qué columna está
    const overTask = tasks.find((t) => t.id === overId);
    if (overTask) {
      setActiveColumn(overTask.status);
    }
  };

  // Función para mover tarea con fecha
  const moveTaskWithDate = async (
    task: TaskWithRelations,
    newStatus: TaskStatus,
    newDate: string | null
  ) => {
    const updatedTask = {
      ...task,
      status: newStatus,
      due_date: newDate,
      completed_at: newStatus === "completed" ? new Date().toISOString() : null,
    };
    updateTask(updatedTask);

    const { error } = await supabase
      .from("tasks")
      .update({
        status: newStatus,
        due_date: newDate,
        completed_at: updatedTask.completed_at,
        updated_at: new Date().toISOString(),
      })
      .eq("id", task.id);

    if (error) {
      toast.error("Error al mover la tarea");
      updateTask(task);
    } else {
      const messages: Record<TaskStatus, string> = {
        pending: "Tarea movida a pendientes",
        today: "Tarea programada para hoy",
        scheduled: "Tarea programada",
        overdue: "Tarea movida",
        completed: "Tarea completada",
        archived: "Tarea archivada",
      };
      toast.success(messages[newStatus]);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    const currentActiveColumn = activeColumn;

    setActiveTask(null);
    setActiveColumn(null);

    if (!over || !currentActiveColumn) return;

    const taskId = active.id as string;
    const task = tasks.find((t) => t.id === taskId);

    if (!task) return;

    // Determinar la columna destino
    let newStatus: TaskStatus = currentActiveColumn;

    // Si over.id es una columna válida, usarla directamente
    if (VALID_COLUMNS.includes(over.id as TaskStatus)) {
      newStatus = over.id as TaskStatus;
    }

    // Si la tarea ya está en esa columna, no hacer nada
    if (task.status === newStatus) return;

    // Lógica especial según la columna destino
    const today = new Date().toISOString().split("T")[0];

    switch (newStatus) {
      case "pending":
        // Quitar la fecha
        await moveTaskWithDate(task, newStatus, null);
        break;

      case "today":
        // Asignar fecha de hoy automáticamente
        await moveTaskWithDate(task, newStatus, today);
        break;

      case "scheduled":
      case "overdue":
        // Mostrar popup para elegir fecha
        setPendingDateTask({ task, targetStatus: newStatus });
        break;

      case "completed":
      case "archived":
        // Mover directamente sin cambiar fecha
        await moveTaskWithDate(task, newStatus, task.due_date);
        break;

      default:
        await moveTaskWithDate(task, newStatus, task.due_date);
    }
  };

  const handleDateSelect = async (date: string) => {
    if (!pendingDateTask) return;

    await moveTaskWithDate(
      pendingDateTask.task,
      pendingDateTask.targetStatus,
      date
    );
    setPendingDateTask(null);
  };

  const handleDateCancel = () => {
    setPendingDateTask(null);
  };

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);
  const commentsModalTask = tasks.find((t) => t.id === commentsModalTaskId);

  return (
    <div className="h-full">
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 h-full">
          {COLUMN_CONFIG.map((column) => (
            <Column
              key={column.id}
              id={column.id}
              title={column.title}
              color={column.color}
              tasks={tasksByColumn[column.id]}
              categories={categories}
              isDropTarget={activeColumn === column.id && activeTask !== null}
              collapsible={column.collapsible}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask && (
            <TaskCard
              task={activeTask}
              category={categories.find((c) => c.id === activeTask.category_id)}
              isDragging
            />
          )}
        </DragOverlay>
      </DndContext>

      {/* Panel de detalle de tarea */}
      {selectedTask && (
        <TaskDetailPanel task={selectedTask} categories={categories} />
      )}

      {/* Botón de nueva tarea */}
      {currentProfileId && <NewTaskButton profileId={currentProfileId} />}

      {/* Modal para seleccionar fecha */}
      <DatePickerModal
        open={pendingDateTask !== null}
        onClose={handleDateCancel}
        onSelect={handleDateSelect}
        title="Seleccionar fecha"
        description={
          pendingDateTask?.targetStatus === "scheduled"
            ? "Elige la fecha en que quieres programar esta tarea"
            : "Elige la fecha de vencimiento de esta tarea"
        }
      />

      {/* Modal de comentarios rápidos */}
      {commentsModalTask && (
        <CommentsModal
          task={commentsModalTask}
          open={!!commentsModalTaskId}
          onClose={() => setCommentsModalTaskId(null)}
        />
      )}
    </div>
  );
}
