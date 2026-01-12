"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store";
import { cn } from "@/lib/utils";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { es } from "date-fns/locale";

export function MiniCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { tasks, selectedDate, setSelectedDate } = useAppStore();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let day = startDate;
  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }

  const weekDays = ["L", "M", "X", "J", "V", "S", "D"];

  const hasTasksOnDay = (date: Date) => {
    return tasks.some((task) => {
      if (!task.due_date) return false;
      return isSameDay(new Date(task.due_date), date);
    });
  };

  const handleDateClick = (date: Date) => {
    if (selectedDate && isSameDay(selectedDate, date)) {
      setSelectedDate(null);
    } else {
      setSelectedDate(date);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          {format(currentMonth, "MMMM yyyy", { locale: es })}
        </h3>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {weekDays.map((dayName) => (
          <div
            key={dayName}
            className="text-xs font-medium text-muted-foreground py-1"
          >
            {dayName}
          </div>
        ))}
        {days.map((dayDate, index) => {
          const hasTasks = hasTasksOnDay(dayDate);
          const isSelected = selectedDate && isSameDay(selectedDate, dayDate);
          const isCurrentMonth = isSameMonth(dayDate, currentMonth);
          const isCurrentDay = isToday(dayDate);

          return (
            <button
              key={index}
              onClick={() => handleDateClick(dayDate)}
              className={cn(
                "relative h-8 w-8 rounded-md text-sm transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                !isCurrentMonth && "text-muted-foreground/50",
                isSelected && "bg-primary text-primary-foreground",
                isCurrentDay && !isSelected && "bg-accent font-bold",
                hasTasks && !isSelected && "font-semibold"
              )}
            >
              {format(dayDate, "d")}
              {hasTasks && (
                <span
                  className={cn(
                    "absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full",
                    isSelected ? "bg-primary-foreground" : "bg-primary"
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={() => setSelectedDate(null)}
        >
          Mostrar todas las tareas
        </Button>
      )}
    </div>
  );
}
