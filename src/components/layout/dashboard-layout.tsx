"use client";

import { useEffect } from "react";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { useAppStore } from "@/store";
import type { Profile, Category, UserSettings } from "@/types/database";

interface DashboardLayoutProps {
  children: React.ReactNode;
  user: { id: string; email: string };
  profiles: Profile[];
  currentProfile: Profile | null;
  settings: UserSettings | null;
  categories: Category[];
}

export function DashboardLayout({
  children,
  user,
  profiles,
  currentProfile,
  settings,
  categories,
}: DashboardLayoutProps) {
  const {
    setUser,
    setProfiles,
    setCurrentProfile,
    setSettings,
    setCategories,
  } = useAppStore();

  // Inicializar el store con los datos del servidor
  useEffect(() => {
    setUser(user);
    setProfiles(profiles);
    setCurrentProfile(currentProfile);
    setSettings(settings);
    setCategories(categories);
  }, [
    user,
    profiles,
    currentProfile,
    settings,
    categories,
    setUser,
    setProfiles,
    setCurrentProfile,
    setSettings,
    setCategories,
  ]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
