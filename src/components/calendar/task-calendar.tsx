"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TaskDetailPanel } from "@/components/tasks/task-detail-panel";
import { NewTaskButton } from "@/components/tasks/new-task-button";
import { CommentsModal } from "@/components/tasks/comments-modal";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import type { TaskWithRelations, Category } from "@/types/database";

interface TaskCalendarProps {
  tasks: TaskWithRelations[];
  categories: Category[];
  currentProfileId?: string;
}

const DAYS_OF_WEEK = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export function TaskCalendar({
  tasks: initialTasks,
  categories: initialCategories,
  currentProfileId,
}: TaskCalendarProps) {
  const {
    tasks,
    setTasks,
    categories,
    setCategories,
    selectedTaskId,
    setSelectedTaskId,
    searchQuery,
    filterCategory,
    filterPriority,
    commentsModalTaskId,
    setCommentsModalTaskId,
  } = useAppStore();

  const [currentDate, setCurrentDate] = useState(new Date());

  // Inicializar tareas y categorías
  useMemo(() => {
    if (initialTasks.length > 0 && tasks.length === 0) {
      setTasks(initialTasks as TaskWithRelations[]);
    }
    if (initialCategories.length > 0 && categories.length === 0) {
      setCategories(initialCategories);
    }
  }, [initialTasks, initialCategories, tasks.length, categories.length, setTasks, setCategories]);

  // Filtrar tareas
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Excluir tareas archivadas
      if (task.status === "archived") return false;

      // Filtro de búsqueda
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesDescription = task.description?.toLowerCase().includes(query);
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

      return true;
    });
  }, [tasks, searchQuery, filterCategory, filterPriority]);

  // Agrupar tareas por fecha
  const tasksByDate = useMemo(() => {
    const grouped: Record<string, TaskWithRelations[]> = {};

    filteredTasks.forEach((task) => {
      if (task.due_date) {
        const dateKey = task.due_date.split("T")[0];
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(task);
      }
    });

    // Ordenar por prioridad
    Object.keys(grouped).forEach((date) => {
      grouped[date].sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
    });

    return grouped;
  }, [filteredTasks]);

  // Tareas sin fecha
  const tasksWithoutDate = useMemo(() => {
    return filteredTasks.filter((task) => !task.due_date);
  }, [filteredTasks]);

  // Generar días del mes
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Ajustar para que la semana empiece en lunes
    let startDay = firstDay.getDay() - 1;
    if (startDay < 0) startDay = 6;

    const days: { date: Date | null; isCurrentMonth: boolean }[] = [];

    // Días del mes anterior
    const prevMonth = new Date(year, month, 0);
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonth.getDate() - i),
        isCurrentMonth: false,
      });
    }

    // Días del mes actual
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Días del mes siguiente para completar la cuadrícula
    const remainingDays = 42 - days.length; // 6 semanas * 7 días
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentDate]);

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const formatDateKey = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isPast = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const getTaskIcon = (task: TaskWithRelations) => {
    if (task.status === "completed") {
      return <CheckCircle className="h-3 w-3 text-green-500" />;
    }
    if (task.due_date && isPast(new Date(task.due_date)) && task.status !== "completed") {
      return <AlertTriangle className="h-3 w-3 text-red-500" />;
    }
    return <Clock className="h-3 w-3 text-muted-foreground" />;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-l-red-500";
      case "medium":
        return "border-l-yellow-500";
      case "low":
        return "border-l-green-500";
      default:
        return "border-l-gray-500";
    }
  };

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);
  const commentsModalTask = tasks.find((t) => t.id === commentsModalTaskId);

  return (
    <div className="h-full flex flex-col">
      {/* Header del calendario */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">
            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Hoy
          </Button>
          <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Calendario principal */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Días de la semana */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS_OF_WEEK.map((day) => (
              <div
                key={day}
                className="text-center text-sm font-medium text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Cuadrícula del calendario */}
          <div className="flex-1 grid grid-cols-7 gap-1 auto-rows-fr">
            {calendarDays.map(({ date, isCurrentMonth }, index) => {
              if (!date) return <div key={index} />;

              const dateKey = formatDateKey(date);
              const dayTasks = tasksByDate[dateKey] || [];
              const dayIsToday = isToday(date);
              const dayIsPast = isPast(date) && !dayIsToday;

              return (
                <div
                  key={index}
                  className={cn(
                    "border rounded-lg p-1 min-h-[100px] flex flex-col",
                    !isCurrentMonth && "opacity-40",
                    dayIsToday && "border-primary border-2 bg-primary/5",
                    dayIsPast && isCurrentMonth && "bg-muted/30"
                  )}
                >
                  {/* Número del día */}
                  <div
                    className={cn(
                      "text-sm font-medium mb-1 px-1",
                      dayIsToday && "text-primary"
                    )}
                  >
                    {date.getDate()}
                  </div>

                  {/* Tareas del día */}
                  <ScrollArea className="flex-1">
                    <div className="space-y-1 px-0.5">
                      {dayTasks.slice(0, 3).map((task) => {
                        const category = categories.find(
                          (c) => c.id === task.category_id
                        );
                        return (
                          <div
                            key={task.id}
                            onClick={() => setSelectedTaskId(task.id)}
                            className={cn(
                              "text-xs p-1.5 rounded cursor-pointer border-l-2 transition-colors",
                              "bg-card hover:bg-accent",
                              getPriorityColor(task.priority),
                              task.status === "completed" && "opacity-60 line-through"
                            )}
                          >
                            <div className="flex items-center gap-1">
                              {getTaskIcon(task)}
                              <span className="truncate flex-1">{task.title}</span>
                            </div>
                            {category && (
                              <Badge
                                variant="secondary"
                                className="mt-1 text-[10px] px-1 py-0"
                                style={{
                                  backgroundColor: category.color + "20",
                                  color: category.color,
                                }}
                              >
                                {category.name}
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                      {dayTasks.length > 3 && (
                        <div className="text-[10px] text-muted-foreground px-1">
                          +{dayTasks.length - 3} más
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel lateral - Tareas sin fecha */}
        {tasksWithoutDate.length > 0 && (
          <div className="w-64 flex-shrink-0 border rounded-lg p-3 bg-card hidden lg:flex flex-col">
            <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Sin fecha ({tasksWithoutDate.length})
            </h3>
            <ScrollArea className="flex-1">
              <div className="space-y-2">
                {tasksWithoutDate.map((task) => {
                  const category = categories.find(
                    (c) => c.id === task.category_id
                  );
                  return (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      className={cn(
                        "text-sm p-2 rounded cursor-pointer border-l-2 transition-colors",
                        "bg-muted/50 hover:bg-accent",
                        getPriorityColor(task.priority)
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {getTaskIcon(task)}
                        <span className="truncate">{task.title}</span>
                      </div>
                      {category && (
                        <Badge
                          variant="secondary"
                          className="mt-1 text-[10px]"
                          style={{
                            backgroundColor: category.color + "20",
                            color: category.color,
                          }}
                        >
                          {category.name}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Panel de detalle de tarea */}
      {selectedTask && (
        <TaskDetailPanel task={selectedTask} categories={categories} />
      )}

      {/* Botón de nueva tarea */}
      {currentProfileId && <NewTaskButton profileId={currentProfileId} />}

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
