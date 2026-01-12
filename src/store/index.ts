import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Profile,
  Category,
  Task,
  TaskWithRelations,
  UserSettings,
} from "@/types/database";

interface AppState {
  // Usuario y sesión
  user: { id: string; email: string } | null;
  setUser: (user: { id: string; email: string } | null) => void;

  // Perfil activo
  currentProfile: Profile | null;
  profiles: Profile[];
  setCurrentProfile: (profile: Profile | null) => void;
  setProfiles: (profiles: Profile[]) => void;
  addProfile: (profile: Profile) => void;
  updateProfile: (profile: Profile) => void;
  removeProfile: (profileId: string) => void;

  // Categorías
  categories: Category[];
  setCategories: (categories: Category[]) => void;
  addCategory: (category: Category) => void;
  updateCategory: (category: Category) => void;
  removeCategory: (categoryId: string) => void;

  // Tareas
  tasks: TaskWithRelations[];
  setTasks: (tasks: TaskWithRelations[]) => void;
  addTask: (task: TaskWithRelations) => void;
  updateTask: (task: TaskWithRelations) => void;
  removeTask: (taskId: string) => void;

  // Configuración
  settings: UserSettings | null;
  setSettings: (settings: UserSettings | null) => void;

  // UI State
  selectedTaskId: string | null;
  setSelectedTaskId: (taskId: string | null) => void;
  isTaskPanelOpen: boolean;
  setTaskPanelOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterCategory: string | null;
  setFilterCategory: (categoryId: string | null) => void;
  filterPriority: string | null;
  setFilterPriority: (priority: string | null) => void;
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;

  // Vista
  view: "columns" | "calendar";
  setView: (view: "columns" | "calendar") => void;

  // Resumen diario
  showDailySummary: boolean;
  setShowDailySummary: (show: boolean) => void;

  // Selección múltiple
  selectedTaskIds: string[];
  toggleTaskSelection: (taskId: string) => void;
  clearSelection: () => void;
  selectAll: (taskIds: string[]) => void;

  // Modal de comentarios rápidos
  commentsModalTaskId: string | null;
  setCommentsModalTaskId: (taskId: string | null) => void;

  // Modal de nueva tarea con columna inicial
  newTaskModalOpen: boolean;
  newTaskInitialColumn: string | null;
  openNewTaskModal: (column?: string | null) => void;
  closeNewTaskModal: () => void;

  // Reset
  reset: () => void;
}

const initialState = {
  user: null,
  currentProfile: null,
  profiles: [],
  categories: [],
  tasks: [],
  settings: null,
  selectedTaskId: null,
  isTaskPanelOpen: false,
  searchQuery: "",
  filterCategory: null,
  filterPriority: null,
  selectedDate: null,
  view: "columns" as const,
  showDailySummary: false,
  selectedTaskIds: [],
  commentsModalTaskId: null,
  newTaskModalOpen: false,
  newTaskInitialColumn: null,
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialState,

      // Usuario
      setUser: (user) => set({ user }),

      // Perfiles
      setCurrentProfile: (profile) => set({ currentProfile: profile }),
      setProfiles: (profiles) => set({ profiles }),
      addProfile: (profile) =>
        set((state) => ({ profiles: [...state.profiles, profile] })),
      updateProfile: (profile) =>
        set((state) => ({
          profiles: state.profiles.map((p) =>
            p.id === profile.id ? profile : p
          ),
          currentProfile:
            state.currentProfile?.id === profile.id
              ? profile
              : state.currentProfile,
        })),
      removeProfile: (profileId) =>
        set((state) => ({
          profiles: state.profiles.filter((p) => p.id !== profileId),
          currentProfile:
            state.currentProfile?.id === profileId
              ? null
              : state.currentProfile,
        })),

      // Categorías
      setCategories: (categories) => set({ categories }),
      addCategory: (category) =>
        set((state) => ({ categories: [...state.categories, category] })),
      updateCategory: (category) =>
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === category.id ? category : c
          ),
        })),
      removeCategory: (categoryId) =>
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== categoryId),
        })),

      // Tareas
      setTasks: (tasks) => set({ tasks }),
      addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
      updateTask: (task) =>
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === task.id ? task : t)),
        })),
      removeTask: (taskId) =>
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== taskId),
          selectedTaskId:
            state.selectedTaskId === taskId ? null : state.selectedTaskId,
          selectedTaskIds: state.selectedTaskIds.filter((id) => id !== taskId),
        })),

      // Configuración
      setSettings: (settings) => set({ settings }),

      // UI
      setSelectedTaskId: (taskId) =>
        set({ selectedTaskId: taskId, isTaskPanelOpen: !!taskId }),
      setTaskPanelOpen: (open) =>
        set({ isTaskPanelOpen: open, selectedTaskId: open ? undefined : null }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setFilterCategory: (categoryId) => set({ filterCategory: categoryId }),
      setFilterPriority: (priority) => set({ filterPriority: priority }),
      setSelectedDate: (date) => set({ selectedDate: date }),

      // Vista
      setView: (view) => set({ view }),

      // Resumen diario
      setShowDailySummary: (show) => set({ showDailySummary: show }),

      // Selección múltiple
      toggleTaskSelection: (taskId) =>
        set((state) => ({
          selectedTaskIds: state.selectedTaskIds.includes(taskId)
            ? state.selectedTaskIds.filter((id) => id !== taskId)
            : [...state.selectedTaskIds, taskId],
        })),
      clearSelection: () => set({ selectedTaskIds: [] }),
      selectAll: (taskIds) => set({ selectedTaskIds: taskIds }),

      // Modal de comentarios rápidos
      setCommentsModalTaskId: (taskId) => set({ commentsModalTaskId: taskId }),

      // Modal de nueva tarea con columna inicial
      openNewTaskModal: (column = null) =>
        set({ newTaskModalOpen: true, newTaskInitialColumn: column }),
      closeNewTaskModal: () =>
        set({ newTaskModalOpen: false, newTaskInitialColumn: null }),

      // Reset
      reset: () => set(initialState),
    }),
    {
      name: "tutodotareas-storage",
      partialize: (state) => ({
        currentProfile: state.currentProfile,
        view: state.view,
      }),
    }
  )
);
