import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/auth-forms";

export default function LoginPage() {
  return (
    <AuthShell mode="login">
      <LoginForm />
    </AuthShell>
  );
}
