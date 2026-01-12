"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  ArrowLeft,
  User,
  Palette,
  FolderOpen,
  Tag,
  LogOut,
  Trash2,
  Plus,
  Save,
  Lock,
  Loader2,
} from "lucide-react";
import { useTheme } from "next-themes";
import type { Profile, Category } from "@/types/database";

const CATEGORY_COLORS = [
  { name: "Rosa", value: "#FECDD3" },
  { name: "Azul", value: "#BFDBFE" },
  { name: "Verde", value: "#BBF7D0" },
  { name: "Amarillo", value: "#FEF08A" },
  { name: "Morado", value: "#DDD6FE" },
  { name: "Naranja", value: "#FED7AA" },
  { name: "Cian", value: "#A5F3FC" },
  { name: "Gris", value: "#E5E7EB" },
];

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();

  const {
    user,
    profiles,
    currentProfile,
    categories,
    settings,
    addProfile,
    updateProfile,
    removeProfile,
    addCategory,
    updateCategory,
    removeCategory,
    setSettings,
    reset,
  } = useAppStore();

  // Estados para formularios
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileColor, setNewProfileColor] = useState("#BFDBFE");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#BFDBFE");
  const [autoArchiveDays, setAutoArchiveDays] = useState(
    settings?.auto_archive_days || 2
  );
  const [saving, setSaving] = useState(false);

  // Estados para cambio de contraseña
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const handleCreateProfile = async () => {
    if (!newProfileName.trim() || !user) return;

    const newProfile = {
      user_id: user.id,
      name: newProfileName.trim(),
      color: newProfileColor,
      order: profiles.length,
    };

    const { data, error } = await supabase
      .from("profiles")
      .insert(newProfile)
      .select()
      .single();

    if (error) {
      toast.error("Error al crear el perfil");
    } else {
      addProfile(data as Profile);
      setNewProfileName("");
      toast.success("Perfil creado");
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (profiles.length <= 1) {
      toast.error("Debes tener al menos un perfil");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", profileId);

    if (error) {
      toast.error("Error al eliminar el perfil");
    } else {
      removeProfile(profileId);
      toast.success("Perfil eliminado");
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim() || !currentProfile) return;

    const newCat = {
      profile_id: currentProfile.id,
      name: newCategoryName.trim(),
      color: newCategoryColor,
      order: categories.length,
    };

    const { data, error } = await supabase
      .from("categories")
      .insert(newCat)
      .select()
      .single();

    if (error) {
      toast.error("Error al crear la categoría");
    } else {
      addCategory(data as Category);
      setNewCategoryName("");
      toast.success("Categoría creada");
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", categoryId);

    if (error) {
      toast.error("Error al eliminar la categoría");
    } else {
      removeCategory(categoryId);
      toast.success("Categoría eliminada");
    }
  };

  const handleSaveSettings = async () => {
    if (!user) return;
    setSaving(true);

    const updates = {
      auto_archive_days: autoArchiveDays,
    };

    const { error } = await supabase
      .from("user_settings")
      .update(updates)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Error al guardar la configuración");
    } else {
      if (settings) {
        setSettings({ ...settings, ...updates });
      }
      toast.success("Configuración guardada");
    }

    setSaving(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    reset();
    router.push("/auth/login");
  };

  const handleDeleteAccount = async () => {
    if (!confirm("¿Estás seguro? Esta acción eliminará todos tus datos y no se puede deshacer.")) {
      return;
    }
    toast.error("Función no implementada. Contacta con soporte para eliminar tu cuenta.");
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmNewPassword) {
      toast.error("Por favor, completa todos los campos");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setChangingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Contraseña actualizada correctamente");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
      }
    } catch {
      toast.error("Error al cambiar la contraseña");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center gap-4 px-4 lg:px-6">
          <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Configuración</h1>
        </div>
      </header>

      {/* Content */}
      <main className="container max-w-4xl py-6 px-4">
        <Tabs defaultValue="profiles" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profiles" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Perfiles</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              <span className="hidden sm:inline">Categorías</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Apariencia</span>
            </TabsTrigger>
            <TabsTrigger value="account" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Cuenta</span>
            </TabsTrigger>
          </TabsList>

          {/* Perfiles */}
          <TabsContent value="profiles">
            <Card>
              <CardHeader>
                <CardTitle>Perfiles / Espacios de trabajo</CardTitle>
                <CardDescription>
                  Crea diferentes perfiles para organizar tus tareas (ej: Trabajo, Personal, Proyectos)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Lista de perfiles */}
                <div className="space-y-2">
                  {profiles.map((profile) => (
                    <div
                      key={profile.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: profile.color || "#BFDBFE" }}
                        />
                        <span className="font-medium">{profile.name}</span>
                        {currentProfile?.id === profile.id && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                            Activo
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteProfile(profile.id)}
                        disabled={profiles.length <= 1}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Crear nuevo perfil */}
                <div className="space-y-3">
                  <Label>Crear nuevo perfil</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nombre del perfil"
                      value={newProfileName}
                      onChange={(e) => setNewProfileName(e.target.value)}
                    />
                    <Select value={newProfileColor} onValueChange={setNewProfileColor}>
                      <SelectTrigger className="w-32">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: newProfileColor }}
                          />
                          <span>Color</span>
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_COLORS.map((color) => (
                          <SelectItem key={color.value} value={color.value}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: color.value }}
                              />
                              {color.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={handleCreateProfile}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categorías */}
          <TabsContent value="categories">
            <Card>
              <CardHeader>
                <CardTitle>Categorías</CardTitle>
                <CardDescription>
                  Las categorías del perfil "{currentProfile?.name || "actual"}"
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Lista de categorías */}
                <div className="space-y-2">
                  {categories.length === 0 ? (
                    <p className="text-muted-foreground text-sm py-4 text-center">
                      No hay categorías. Crea una para organizar tus tareas.
                    </p>
                  ) : (
                    categories.map((category) => (
                      <div
                        key={category.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          <span>{category.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteCategory(category.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>

                <Separator />

                {/* Crear nueva categoría */}
                <div className="space-y-3">
                  <Label>Crear nueva categoría</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nombre de la categoría"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                    />
                    <Select value={newCategoryColor} onValueChange={setNewCategoryColor}>
                      <SelectTrigger className="w-32">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: newCategoryColor }}
                          />
                          <span>Color</span>
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_COLORS.map((color) => (
                          <SelectItem key={color.value} value={color.value}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: color.value }}
                              />
                              {color.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={handleCreateCategory}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Apariencia */}
          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle>Apariencia</CardTitle>
                <CardDescription>
                  Personaliza el aspecto de la aplicación
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Tema */}
                <div className="space-y-3">
                  <Label>Tema</Label>
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona un tema" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Claro</SelectItem>
                      <SelectItem value="dark">Oscuro</SelectItem>
                      <SelectItem value="system">Automático (sistema)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Auto-archivar */}
                <div className="space-y-3">
                  <Label>Auto-archivar tareas completadas</Label>
                  <p className="text-sm text-muted-foreground">
                    Las tareas completadas se archivarán automáticamente después de este número de días
                  </p>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min="1"
                      max="30"
                      value={autoArchiveDays}
                      onChange={(e) => setAutoArchiveDays(Number(e.target.value))}
                      className="w-20"
                    />
                    <span className="text-muted-foreground">días</span>
                  </div>
                </div>

                <Button onClick={handleSaveSettings} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Guardando..." : "Guardar cambios"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cuenta */}
          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle>Cuenta</CardTitle>
                <CardDescription>
                  Gestiona tu cuenta y sesión
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Info de la cuenta */}
                <div className="space-y-2">
                  <Label>Email</Label>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>

                <Separator />

                {/* Cambiar contraseña */}
                <div className="space-y-3">
                  <Label>Cambiar contraseña</Label>
                  <div className="space-y-3 max-w-sm">
                    <Input
                      type="password"
                      placeholder="Nueva contraseña"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={changingPassword}
                    />
                    <Input
                      type="password"
                      placeholder="Confirmar nueva contraseña"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      disabled={changingPassword}
                    />
                    <Button
                      onClick={handleChangePassword}
                      disabled={changingPassword || !newPassword || !confirmNewPassword}
                    >
                      {changingPassword ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Cambiando...
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4 mr-2" />
                          Cambiar contraseña
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Cerrar sesión */}
                <div className="space-y-3">
                  <Label>Sesión</Label>
                  <Button variant="outline" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Cerrar sesión
                  </Button>
                </div>

                <Separator />

                {/* Eliminar cuenta */}
                <div className="space-y-3">
                  <Label className="text-destructive">Zona de peligro</Label>
                  <p className="text-sm text-muted-foreground">
                    Eliminar tu cuenta borrará permanentemente todos tus datos
                  </p>
                  <Button variant="destructive" onClick={handleDeleteAccount}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar cuenta
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
