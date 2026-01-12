import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">TuTodoTareas</h1>
          <p className="text-muted-foreground mt-2">
            Crea tu cuenta y empieza a organizarte
          </p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}
