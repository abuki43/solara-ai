import Link from "next/link";

import { LoginForm } from "@/components/auth/auth-forms";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F4F0] p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link href="/" className="font-pixel text-xs tracking-[0.25em] text-black/50">
            SOLAR AI
          </Link>
        </div>
        <LoginForm />
        <p className="text-center text-sm text-muted-foreground">
          No account?{" "}
          <Link href="/signup" className="underline underline-offset-4">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
