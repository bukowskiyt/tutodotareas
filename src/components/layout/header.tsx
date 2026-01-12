"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  Search,
  Sun,
  Moon,
  Settings,
  LogOut,
  Plus,
  Calendar,
  LayoutGrid,
  Menu,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";

export function Header() {
  const router = useRouter();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);

  const {
    user,
    profiles,
    currentProfile,
    setCurrentProfile,
    searchQuery,
    setSearchQuery,
    view,
    setView,
  } = useAppStore();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error al cerrar sesión");
      return;
    }
    router.push("/auth/login");
    router.refresh();
  };

  const handleProfileChange = async (profileId: string) => {
    const profile = profiles.find((p) => p.id === profileId);
    if (profile) {
      setCurrentProfile(profile);
      // Actualizar en la base de datos
      await supabase
        .from("user_settings")
        .update({ default_profile_id: profileId })
        .eq("user_id", user?.id);
      router.refresh();
    }
  };

  const getUserInitials = () => {
    if (!user?.email) return "U";
    return user.email.charAt(0).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center gap-4 px-4 lg:px-6">
        {/* Menú móvil */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Menú</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72">
            <Sidebar />
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg hidden sm:inline-block">
            TuTodoTareas
          </span>
          <span className="font-bold text-lg sm:hidden">TTT</span>
        </div>

        {/* Selector de perfil */}
        <Select
          value={currentProfile?.id}
          onValueChange={handleProfileChange}
        >
          <SelectTrigger className="w-[140px] sm:w-[180px]">
            <SelectValue placeholder="Seleccionar perfil" />
          </SelectTrigger>
          <SelectContent>
            {profiles.map((profile) => (
              <SelectItem key={profile.id} value={profile.id}>
                <div className="flex items-center gap-2">
                  {profile.color && (
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: profile.color }}
                    />
                  )}
                  {profile.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Buscador */}
        <div className="flex-1 flex justify-center">
          {searchOpen ? (
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar tareas..."
                className="pl-9 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => !searchQuery && setSearchOpen(false)}
                autoFocus
              />
            </div>
          ) : (
            <Button
              variant="outline"
              className="hidden sm:flex items-center gap-2 text-muted-foreground"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-4 w-4" />
              <span>Buscar...</span>
              <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
          )}
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2">
          {/* Toggle vista */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setView(view === "columns" ? "calendar" : "columns")}
            title={view === "columns" ? "Vista calendario" : "Vista columnas"}
          >
            {view === "columns" ? (
              <Calendar className="h-5 w-5" />
            ) : (
              <LayoutGrid className="h-5 w-5" />
            )}
          </Button>

          {/* Buscar (móvil) */}
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* Toggle tema */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Cambiar tema</span>
          </Button>

          {/* Menú usuario */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarFallback>{getUserInitials()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">Mi cuenta</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                <Settings className="mr-2 h-4 w-4" />
                Configuración
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
