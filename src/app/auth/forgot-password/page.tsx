"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Mail, ArrowLeft, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback/recovery`,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      setSent(true);
      toast.success("Email enviado correctamente");
    } catch {
      toast.error("Error al enviar el email");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground">TuTodoTareas</h1>
          </div>
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>Revisa tu email</CardTitle>
              <CardDescription>
                Hemos enviado un enlace de recuperación a <strong>{email}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center text-sm text-muted-foreground">
              <p>
                Si no ves el email, revisa tu carpeta de spam o correo no deseado.
              </p>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setSent(false)}
              >
                Enviar de nuevo
              </Button>
              <Link href="/auth/login" className="w-full">
                <Button variant="ghost" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver al inicio de sesión
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">TuTodoTareas</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Recuperar contraseña</CardTitle>
            <CardDescription>
              Introduce tu email y te enviaremos un enlace para restablecer tu contraseña
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Enviar enlace de recuperación
                  </>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Link
              href="/auth/login"
              className="text-sm text-muted-foreground hover:text-primary flex items-center"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Volver al inicio de sesión
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
